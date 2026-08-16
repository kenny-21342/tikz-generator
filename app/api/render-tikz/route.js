import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, mkdtemp, rm, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { checkAll, clientIp } from '@/lib/rateLimit';
import {
  renderBodyExceedsLimit,
  validateRenderCode,
} from '@/lib/routeGuards';

const execFileAsync = promisify(execFile);

// pdflatex is not billed, but it is expensive: each render forks a process that
// can burn a 30 s CPU timeout. Without a limit a single visitor can pin every
// worker and take the app down, so this route needs throttling as much as the
// AI route does. Same in-memory caveat applies (see lib/rateLimit.js).
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const RENDER_PER_MINUTE = 12;
const RENDER_PER_HOUR = 120;

const LATEX_TIMEOUT_MS = 30000;
const CONVERT_TIMEOUT_MS = 15000;
const MAX_OUTPUT_BUFFER = 5 * 1024 * 1024;
// Only expose compiler output in development — it can echo back file paths and,
// with a crafted document, file contents.
const EXPOSE_TOOL_OUTPUT = process.env.NODE_ENV !== 'production';

// TeX primitives that read or write files outside the job, or shell out. `pdflatex`
// is already run without -shell-escape and with openin/openout restricted to the
// temp dir, so this is defence in depth rather than the only barrier.
// pdflatex needs PATH/HOME/TEXMF* to find its distribution, but it has no
// business inheriting API keys. Shell escape is already off and file I/O is
// confined to the temp dir, so this is defence in depth: even if a future TeX
// bug let a document read the environment, there would be no secret to read.
const SECRET_ENV = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|SESSION|COOKIE|DSN|DATABASE_URL|CONNECTION_STRING)/i;

function secretFreeEnv() {
  const safe = {};
  for (const [name, value] of Object.entries(process.env)) {
    if (!SECRET_ENV.test(name)) safe[name] = value;
  }
  return safe;
}

function errorPayload(error, status = 500, extra = {}) {
  return NextResponse.json({
    error,
    ...extra,
  }, { status });
}

async function runTool(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, {
      timeout: options.timeout,
      maxBuffer: MAX_OUTPUT_BUFFER,
      cwd: options.cwd,
      env: options.env,
    });
    return {
      ok: true,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  } catch (err) {
    return {
      ok: false,
      code: err.code,
      signal: err.signal,
      killed: err.killed,
      stdout: err.stdout || '',
      stderr: err.stderr || '',
      message: err.message || `${command} failed`,
    };
  }
}

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readLatexFailure(logFile, fallbackOutput) {
  let error = 'LaTeX compilation failed. Check the TikZ code for syntax or package errors.';
  let errorContext = '';
  try {
    const logContent = await readFile(logFile, 'utf-8');
    const lines = logContent.split('\n');
    const errIdx = lines.findIndex((line) => line.startsWith('!'));
    if (errIdx >= 0) {
      error = lines[errIdx].replace(/^!\s*/, '').trim() || error;
      errorContext = lines.slice(Math.max(0, errIdx - 2), errIdx + 8).join('\n');
    }
  } catch {
    errorContext = fallbackOutput.split('\n').slice(-12).join('\n');
  }
  return { error, errorContext };
}

function summarizeToolResult(name, result) {
  if (result.code === 'ENOENT') return `${name}: not installed or not on PATH`;
  if (result.killed || result.signal === 'SIGTERM') return `${name}: timed out`;
  const output = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
  return `${name}: ${output.split('\n').slice(0, 3).join(' ') || result.message}`;
}

export async function POST(request) {
  let tempDir = null;
  try {
    const ip = clientIp(request);
    const gate = checkAll([
      {
        key: `render:ip:min:${ip}`,
        limit: RENDER_PER_MINUTE,
        windowMs: MINUTE_MS,
        message: `Too many preview renders (limit ${RENDER_PER_MINUTE} per minute). Your code is unaffected — you can still copy or download it.`,
      },
      {
        key: `render:ip:hour:${ip}`,
        limit: RENDER_PER_HOUR,
        windowMs: HOUR_MS,
        message: `Hourly preview render limit reached (${RENDER_PER_HOUR} per hour). Your code is unaffected — you can still copy or download it.`,
      },
    ]);
    if (!gate.allowed) {
      return NextResponse.json(
        { error: `${gate.message} Please wait about ${gate.retryAfter} seconds.` },
        { status: 429, headers: { 'Retry-After': String(gate.retryAfter) } },
      );
    }

    const raw = await request.text().catch(() => null);
    if (raw === null) return errorPayload('Could not read the request body.', 400);
    if (renderBodyExceedsLimit(raw)) {
      return errorPayload('TikZ render request is too large.', 413);
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      body = {};
    }
    const { tikzCode } = body;
    const validation = validateRenderCode(tikzCode);
    if (!validation.ok) {
      return errorPayload(validation.error, validation.status, {
        ...(validation.forbidden ? {
          details: 'File I/O, shell escapes, and preamble commands are rejected. Put packages in your own document instead.',
        } : {}),
      });
    }

    tempDir = await mkdtemp(join(tmpdir(), 'tikz-'));
    const texFile = join(tempDir, 'diagram.tex');
    const pdfFile = join(tempDir, 'diagram.pdf');
    const pngFile = join(tempDir, 'diagram.png');
    const logFile = join(tempDir, 'diagram.log');

    const fullDocument = `\\documentclass[border=2pt]{standalone}
\\usepackage{tikz}
\\usepackage{circuitikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}
\\usetikzlibrary{shapes.geometric, shapes.misc, shapes.symbols, arrows.meta, positioning, calc, circuits.logic.US, circuits.logic.IEC}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\begin{document}
${tikzCode}
\\end{document}
`;

    await writeFile(texFile, fullDocument, 'utf-8');

    // `openin_any=p` / `openout_any=p` confine TeX's file I/O to the job directory,
    // so \input{/etc/passwd} cannot exfiltrate server files into the rendered PNG.
    // TEXMFOUTPUT pins the writable directory to our temp dir.
    const latexEnv = {
      ...secretFreeEnv(),
      openin_any: 'p',
      openout_any: 'p',
      TEXMFOUTPUT: tempDir,
      shell_escape: 'f',
    };
    const latexArgs = [
      '-interaction=nonstopmode',
      '-halt-on-error',
      '-no-shell-escape',
      '-output-directory', tempDir,
      'diagram.tex',
    ];

    const compile = await runTool('pdflatex', latexArgs, {
      cwd: tempDir,
      timeout: LATEX_TIMEOUT_MS,
      env: latexEnv,
    });

    if (compile.code === 'ENOENT') {
      return errorPayload('LaTeX rendering is not configured on this server.', 500, {
        details: 'Install a TeX distribution and make pdflatex available on PATH.',
      });
    }

    const compileOutput = `${compile.stdout}\n${compile.stderr}`.trim();
    if (!(await fileExists(pdfFile))) {
      const parsed = await readLatexFailure(logFile, compileOutput);
      return errorPayload(parsed.error, compile.killed ? 504 : 400, {
        errorContext: parsed.errorContext,
        ...(EXPOSE_TOOL_OUTPUT ? { rawOutput: compileOutput.split('\n').slice(-30).join('\n') } : {}),
      });
    }

    // pgfplots resolves legends and `nodes near coords` positions from the .aux file
    // written by the previous run, so those need a second pass to settle.
    if (/\\begin\{axis\}|\\legend|\\addlegendentry|nodes near coords/.test(tikzCode)) {
      await runTool('pdflatex', latexArgs, { cwd: tempDir, timeout: LATEX_TIMEOUT_MS, env: latexEnv });
    }

    // Convert PDF to PNG. Each strategy verifies that the expected output exists.
    const conversionAttempts = [];
    const convertStrategies = [
      {
        name: 'pdftoppm',
        command: 'pdftoppm',
        args: ['-png', '-r', '300', '-singlefile', pdfFile, join(tempDir, 'diagram')],
      },
      {
        name: 'sips',
        command: 'sips',
        args: ['-s', 'format', 'png', pdfFile, '--out', pngFile],
      },
      {
        name: 'magick',
        command: 'magick',
        args: ['-density', '300', pdfFile, '-quality', '100', pngFile],
      },
      {
        name: 'convert',
        command: 'convert',
        args: ['-density', '300', pdfFile, '-quality', '100', pngFile],
      },
    ];
    for (const strategy of convertStrategies) {
      const result = await runTool(strategy.command, strategy.args, { timeout: CONVERT_TIMEOUT_MS, cwd: tempDir });
      if (result.ok && await fileExists(pngFile)) {
        const imageBuffer = await readFile(pngFile);
        return NextResponse.json({
          success: true,
          image: `data:image/png;base64,${imageBuffer.toString('base64')}`,
          renderer: strategy.name,
        });
      }
      conversionAttempts.push(summarizeToolResult(strategy.name, result));
    }

    return errorPayload('PDF compiled, but no available converter produced a PNG.', 500, {
      details: 'Install poppler-utils (pdftoppm), macOS sips, or ImageMagick (magick/convert).',
      ...(EXPOSE_TOOL_OUTPUT ? { conversionAttempts } : {}),
    });
  } catch (error) {
    console.error('TikZ render error:', error);
    return errorPayload(error.message || 'Failed to render TikZ diagram.', 500, {
      ...(EXPOSE_TOOL_OUTPUT ? { details: error.stderr || error.stdout || '' } : {}),
    });
  } finally {
    // Always cleanup temp dir
    if (tempDir) {
      try { await rm(tempDir, { recursive: true, force: true }); } catch {}
    }
  }
}
