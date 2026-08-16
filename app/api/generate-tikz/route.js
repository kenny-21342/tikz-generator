import { NextResponse } from 'next/server';
import { checkAll, clientIp } from '@/lib/rateLimit';
import {
  bodyExceedsLimit,
  MAX_BODY_BYTES,
  MAX_ELEMENTS_CHARS,
  validateGenerateBody,
} from '@/lib/routeGuards';

// This route speaks the OpenAI-compatible /chat/completions protocol. Google exposes
// that at /v1beta/openai (the bare /v1beta root is the native generateContent API and
// 404s here), so the default must include the /openai segment.
const GEMINI_BASE_URL = (
  process.env.GEMINI_BASE_URL ||
  process.env.ANTHROPIC_BASE_URL ||
  'https://generativelanguage.googleapis.com/v1beta/openai'
).replace(/\/+$/, '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
// Prefer an explicit proxy auth key, else the Anthropic key (proxy bridges both), else the native Google key.
const GEMINI_KEY = process.env.GEMINI_AUTH_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;

const UPSTREAM_TIMEOUT_MS = 60_000;

/* ---------------- Abuse / spend controls ----------------
 * This route is the only thing on the server that costs money per call, so it
 * is the one an anonymous visitor can use to run up a bill. Three layers:
 *   1. per-IP hourly limit   — stops a runaway client or a casual scraper
 *   2. per-IP daily limit    — stops slow-drip abuse that stays under the hour
 *   3. global daily ceiling  — bounds total spend even from many IPs
 * Plus a hard max_tokens cap so no single call can be arbitrarily expensive.
 *
 * All three counters are in-process (see lib/rateLimit.js): they do NOT survive
 * a cold start and are NOT shared between serverless instances. Treat them as a
 * speed bump, and set a real hard budget cap in the provider billing console.
 * Documented in README under "Rate limiting and spend caps".
 */
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const readLimit = (name, fallback) => {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const PER_IP_HOURLY = readLimit('AI_RATE_LIMIT_PER_HOUR', 10);
const PER_IP_DAILY = readLimit('AI_RATE_LIMIT_PER_DAY', 40);
const GLOBAL_DAILY = readLimit('AI_GLOBAL_LIMIT_PER_DAY', 500);

// Hard ceiling on tokens billed per call. The env override can only lower it,
// never raise it above HARD_MAX_TOKENS — a misconfigured deploy must not be
// able to turn one request into an unbounded one.
const HARD_MAX_TOKENS = 8192;
const MAX_TOKENS = Math.min(readLimit('AI_MAX_TOKENS', 4096), HARD_MAX_TOKENS);

/* ---------------- Payload size caps ----------------
 * Enforced on the raw body before parsing, so an oversized request is rejected
 * without ever being buffered into an object graph or forwarded upstream.
 */
function tooMany(message, retryAfter) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

function describeWindow(seconds) {
  if (seconds >= 3600) {
    const hours = Math.ceil(seconds / 3600);
    return hours === 1 ? 'an hour' : `${hours} hours`;
  }
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? 'a minute' : `${minutes} minutes`;
}

function diagramSystemPrompt() {
  return (
    "You are an expert LaTeX typesetter specializing in TikZ and CircuiTikZ. " +
    "You will receive a JSON description of diagram elements. Convert them into valid, compile-ready LaTeX TikZ code. " +
    "Use elegant formatting and semantic relative node positioning (e.g., right=of) where applicable. " +
    "For circuit elements (resistor, capacitor, inductor, battery, diode, ground, voltmeter, ammeter), use CircuiTikZ syntax (e.g. \\draw (a) to[R] (b);). " +
    "For logic gates, use the circuits.logic.US library. " +
    "For flowchart shapes (process, decision, terminator, document), use the shapes.geometric and shapes.misc libraries with proper node shapes. " +
    "For text marked isLatex=true, render its content as inline math ($...$). Apply rotation via 'rotate around={angle:(center)}'. " +
    "Apply fill opacity via 'fill opacity=0.x'. " +
    "Scale coordinates appropriately (divide by 50-100 for reasonable TikZ units). " +
    "CRITICAL: Output ONLY the raw code block. Do not wrap it in markdown code fences like ```latex. " +
    "Start exactly with \\begin{tikzpicture} and end with \\end{tikzpicture}."
  );
}

function graphSystemPrompt() {
  return (
    "You are an expert LaTeX typesetter specializing in pgfplots. " +
    "Convert the provided function list and axis ranges into valid, compile-ready pgfplots code. " +
    "Use \\begin{tikzpicture} wrapping a \\begin{axis} environment. " +
    "Plot each function with \\addplot[domain=...,samples=200] {expr}; and add \\addlegendentry{name}. " +
    "Apply the user's specified xmin/xmax/ymin/ymax, axis labels, title, grid (major/minor), tick settings, legend position, and nodes near coords (data labels) where requested. " +
    "For minor ticks use 'minor tick num='. For legend position use 'legend pos='. " +
    "Translate common math notation (sin, cos, tan, sqrt, abs, exp, ln, log, pi, e) to LaTeX/pgfplots syntax. " +
    "CRITICAL: Output ONLY the raw code. No markdown fences. " +
    "Start exactly with \\begin{tikzpicture} and end with \\end{tikzpicture}."
  );
}

function imageSystemPrompt() {
  return (
    "You are an expert LaTeX typesetter specializing in TikZ, CircuiTikZ, and pgfplots. " +
    "You will be given an image of a diagram, schematic, figure, or mathematical plot. " +
    "Carefully analyze its visual structure: shapes, lines, arrows, text labels, circuit components, " +
    "logic gates, flowchart nodes, graph axes/functions, relative positions, and connections. " +
    "Reproduce it as valid, compile-ready LaTeX TikZ code that visually matches the image as faithfully as possible. " +
    "Use the appropriate libraries: CircuiTikZ for circuits, circuits.logic.US for gates, shapes.geometric for flowchart nodes, pgfplots for plots. " +
    "Preserve all visible text as node labels. Position elements using coordinates that reflect the image's layout. " +
    "Use reasonable TikZ units (cm scale). Apply colors, line styles, fills, and arrowheads where present. " +
    "If the image contains a function plot, use pgfplots with inferred domain and samples. " +
    "CRITICAL: Output ONLY the raw code block. Do not wrap it in markdown fences like ```latex. " +
    "Start exactly with \\begin{tikzpicture} and end with \\end{tikzpicture}."
  );
}

// `retries` is a spend multiplier: each attempt is a separately billed upstream
// call, so one client request could previously cost up to 6. Two retries (3 calls
// max) still rides out a transient 5xx without tripling the worst-case bill.
async function callGemini(systemPrompt, userContent, retries = 2) {
  // userContent is either a string OR an array of content parts
  // (OpenAI multimodal format: [{type:'text',text:...},{type:'image_url',image_url:{url:...}}])
  const body = {
    model: GEMINI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    // Never taken from the request — the client cannot widen its own spend.
    max_tokens: MAX_TOKENS,
  };

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${GEMINI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GEMINI_KEY}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = new Error(data?.error?.message || `HTTP ${res.status}`);
        err.status = res.status;
        // Transient only: 5xx, 429, and the proxy's 400 upstream_error wrapper.
        // A 401/403 will fail identically however many times we ask, so don't retry.
        err.retryable = res.status >= 500 || res.status === 429 || data?.error?.type === 'upstream_error';
        throw err;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (!content || !content.trim()) {
        const err = new Error('Model returned an empty response (try increasing max tokens).');
        err.retryable = true;
        throw err;
      }
      return content.trim();
    } catch (err) {
      lastErr = err;
      // Network faults and timeouts have no `retryable` flag but are worth retrying;
      // an explicit `retryable === false` (a bad key, a bad request) is not.
      const retryable = err.retryable !== false;
      if (retryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      break;
    }
  }
  throw lastErr || new Error('Request failed');
}

export async function POST(request) {
  try {
    if (!GEMINI_KEY) {
      return NextResponse.json({
        error: 'AI generation is not configured on this server.',
        details: 'Set GEMINI_API_KEY (or GEMINI_AUTH_KEY / ANTHROPIC_API_KEY) in your environment.',
      }, { status: 500 });
    }

    // --- Abuse control, before any parsing or upstream work ---
    const ip = clientIp(request);
    const gate = checkAll([
      {
        key: `gen:ip:hour:${ip}`,
        limit: PER_IP_HOURLY,
        windowMs: HOUR_MS,
        message: `Too many AI generations from this address (limit ${PER_IP_HOURLY} per hour). Drawing and local code generation still work — only image-to-TikZ is paused.`,
      },
      {
        key: `gen:ip:day:${ip}`,
        limit: PER_IP_DAILY,
        windowMs: DAY_MS,
        message: `Daily AI generation limit reached for this address (${PER_IP_DAILY} per day). Drawing and local code generation still work.`,
      },
      {
        key: 'gen:global:day',
        limit: GLOBAL_DAILY,
        windowMs: DAY_MS,
        message: 'This demo has hit its shared daily AI budget. Please try again tomorrow — drawing and local code generation are unaffected.',
      },
    ]);
    if (!gate.allowed) {
      return tooMany(`${gate.message} Try again in about ${describeWindow(gate.retryAfter)}.`, gate.retryAfter);
    }

    // --- Payload size cap, enforced on the raw bytes ---
    const declaredLength = Number.parseInt(request.headers.get('content-length') ?? '', 10);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json(
        { error: 'That request is too large. Try a smaller image (under 8 MB) or a simpler drawing.' },
        { status: 413 },
      );
    }
    // Content-Length can be absent (chunked) or dishonest, so re-check the real size.
    const raw = await request.text().catch(() => null);
    if (raw === null) {
      return NextResponse.json({ error: 'Could not read the request body.' }, { status: 400 });
    }
    if (bodyExceedsLimit(raw)) {
      return NextResponse.json(
        { error: 'That request is too large. Try a smaller image (under 8 MB) or a simpler drawing.' },
        { status: 413 },
      );
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = null;
    }
    const validation = validateGenerateBody(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }
    const { elements, projectName, image, mode, functions, xRange, yRange, graphConfig } = body;
    const { isGraph } = validation;
    if (image && typeof image !== 'string') {
      return NextResponse.json({ error: '`image` must be a data URL string' }, { status: 400 });
    }
    // Mirror the client-side cap so a crafted request can't push an unbounded payload
    // upstream. Base64 inflates by ~4/3, so 8 MB of image is ~11 MB of data URL.
    const hasImage = !!image;
    const systemPrompt = isGraph ? graphSystemPrompt() : (hasImage ? imageSystemPrompt() : diagramSystemPrompt());

    let userContent;
    if (hasImage) {
      // OpenAI-compatible multimodal content
      userContent = [
        { type: 'text', text: `Project: ${projectName || 'Imported Image'}\n\nAnalyze this image and convert it into clean, compile-ready TikZ code. Reproduce shapes, text, connections, colors, and layout as faithfully as possible. Use the appropriate TikZ libraries (circuitikz, shapes.geometric, arrows.meta, positioning, etc.).` },
        { type: 'image_url', image_url: { url: image } },
      ];
    } else if (isGraph) {
      const fnList = functions.map((f, i) => `${i + 1}. y = ${f.expr}  (color ${f.color})`).join('\n');
      const cfg = graphConfig || {};
      const cfgLines = [
        `Title: ${cfg.title || '(none)'}`,
        `X axis label: ${cfg.xLabel || '(none)'}`,
        `Y axis label: ${cfg.yLabel || '(none)'}`,
        `Grid: ${cfg.gridStyle || 'both'}`,
        `Major ticks: ${cfg.showMajorTicks !== false ? 'yes' : 'no'}`,
        `Minor ticks: ${cfg.showMinorTicks ? 'yes' : 'no'}`,
        `Legend: ${cfg.showLegend ? `yes (${cfg.legendPosition || 'north east'})` : 'no'}`,
        `Data labels (nodes near coords): ${cfg.showDataLabels ? 'yes' : 'no'}`,
      ].join('\n');
      userContent = `Project: ${projectName || 'Function Plot'}\n\nAxis ranges: x in [${xRange[0]}, ${xRange[1]}], y in [${yRange[0]}, ${yRange[1]}]\n\nChart options:\n${cfgLines}\n\nFunctions:\n${fnList}\n\nGenerate clean pgfplots code. Configure the \\begin{axis}[...] options to honor ALL the chart options above. Include a \\legend{...} entry for each function.`;
    } else if (elements) {
      const elementsDescription = JSON.stringify(elements, null, 2);
      // Guard the serialized size too: few elements can still carry huge point
      // arrays, and prompt length is what actually drives the input token bill.
      if (elementsDescription.length > MAX_ELEMENTS_CHARS) {
        return NextResponse.json(
          { error: 'This drawing is too detailed to convert (over 1 MB of shape data). Try simplifying it or converting a smaller selection.' },
          { status: 413 },
        );
      }
      userContent = `Project: ${projectName || 'Diagram'}\n\nElements (JSON):\n${elementsDescription}\n\nConvert these elements to clean, elegant TikZ code. Scale coordinates appropriately and use proper LaTeX conventions.`;
    } else {
      return NextResponse.json({ error: 'No elements, functions, or image data provided' }, { status: 400 });
    }

    let generatedCode = await callGemini(systemPrompt, userContent);
    // Strip a wrapping markdown fence only at the very start/end. The old global
    // replace deleted backtick runs anywhere in the payload, including inside code.
    generatedCode = generatedCode
      .trim()
      .replace(/^```[a-zA-Z]*[ \t]*\r?\n?/, '')
      .replace(/\r?\n?```$/, '')
      .trim();

    return NextResponse.json({ tikzCode: generatedCode });
  } catch (error) {
    // Full detail to the server log; a short, non-leaky sentence to the browser.
    // Upstream messages can echo back the base URL, model name, or key state.
    console.error('Generation error:', error);

    const upstream = typeof error.status === 'number' ? error.status : null;
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'The AI service took too long to respond. Please try again.' },
        { status: 504 },
      );
    }
    if (upstream === 401 || upstream === 403) {
      return NextResponse.json(
        { error: 'AI generation is misconfigured on this server. Please contact the site owner.' },
        { status: 502 },
      );
    }
    if (upstream === 429) {
      return NextResponse.json(
        { error: 'The AI service is rate-limiting this app right now. Please try again in a few minutes.' },
        { status: 503, headers: { 'Retry-After': '120' } },
      );
    }
    if (upstream && upstream >= 500) {
      return NextResponse.json(
        { error: 'The AI service is temporarily unavailable. Please try again shortly.' },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: 'Could not generate TikZ code from that input. Please try again.' },
      { status: 500 },
    );
  }
}
