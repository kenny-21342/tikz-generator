import { NextResponse } from 'next/server';

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

async function callGemini(systemPrompt, userContent, retries = 5) {
  // userContent is either a string OR an array of content parts
  // (OpenAI multimodal format: [{type:'text',text:...},{type:'image_url',image_url:{url:...}}])
  const body = {
    model: GEMINI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.2,
    max_tokens: 8192,
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

// A [min, max] pair of finite numbers.
const isRange = (v) => Array.isArray(v) && v.length === 2 && v.every((n) => typeof n === 'number' && Number.isFinite(n));

export async function POST(request) {
  try {
    if (!GEMINI_KEY) {
      return NextResponse.json({
        error: 'AI generation is not configured on this server.',
        details: 'Set GEMINI_API_KEY (or GEMINI_AUTH_KEY / ANTHROPIC_API_KEY) in your environment.',
      }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { elements, projectName, image, mode, functions, xRange, yRange, graphConfig } = body;

    if (!elements && !image && !functions) {
      return NextResponse.json({ error: 'No elements, functions, or image data provided' }, { status: 400 });
    }

    const isGraph = mode === 'graph' || (!elements && !image && functions);

    if (isGraph) {
      if (!Array.isArray(functions) || functions.length === 0) {
        return NextResponse.json({ error: '`functions` must be a non-empty array' }, { status: 400 });
      }
      if (!isRange(xRange) || !isRange(yRange)) {
        return NextResponse.json({ error: '`xRange` and `yRange` must each be [min, max] numbers' }, { status: 400 });
      }
    }
    if (image && typeof image !== 'string') {
      return NextResponse.json({ error: '`image` must be a data URL string' }, { status: 400 });
    }
    // Mirror the client-side cap so a crafted request can't push an unbounded payload
    // upstream. Base64 inflates by ~4/3, so 8 MB of image is ~11 MB of data URL.
    if (typeof image === 'string' && image.length > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image is too large (max 8 MB).' }, { status: 413 });
    }
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
    console.error('Generation error:', error);
    const status = error.name === 'TimeoutError' ? 504
      : (typeof error.status === 'number' && error.status >= 400 && error.status < 600) ? error.status
      : 500;
    return NextResponse.json({ error: error.message || 'Failed to generate code' }, { status });
  }
}
