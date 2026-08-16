/**
 * Pure request guards shared by the API handlers and their unit tests.
 *
 * Keeping validation independent of NextResponse makes it possible to exercise
 * the abuse boundary without starting a development server or calling an AI
 * provider / TeX installation.
 */

export const MAX_BODY_BYTES = 13 * 1024 * 1024;
export const MAX_IMAGE_CHARS = 12 * 1024 * 1024;
export const MAX_ELEMENTS = 5_000;
export const MAX_ELEMENTS_CHARS = 1024 * 1024;
export const MAX_FUNCTIONS = 50;
export const MAX_EXPR_CHARS = 500;
export const MAX_NAME_CHARS = 200;
export const MAX_TIKZ_LENGTH = 200_000;
// Keep the JSON envelope itself bounded before /api/render-tikz parses it.
export const MAX_RENDER_BODY_BYTES = MAX_TIKZ_LENGTH + 4 * 1024;

const IMAGE_DATA_URL = /^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i;
const FORBIDDEN_TEX = [
  /\\write\s*18/i,
  /\\immediate\s*\\write\s*18/i,
  /\\input\b/i,
  /\\include\b/i,
  /\\openin\b/i,
  /\\openout\b/i,
  /\\read\b/i,
  /\\catcode/i,
  /\\ShellEscape/i,
  /\\directlua/i,
  /\\usepackage\b/i,
  /\\documentclass\b/i,
];

const invalid = (status, error) => ({ ok: false, status, error });

/** Return the UTF-8 byte count, rather than JavaScript's UTF-16 code-unit count. */
export function byteLength(value) {
  return Buffer.byteLength(value, 'utf8');
}

export function bodyExceedsLimit(raw) {
  return typeof raw === 'string' && byteLength(raw) > MAX_BODY_BYTES;
}

export function renderBodyExceedsLimit(raw) {
  return typeof raw === 'string' && byteLength(raw) > MAX_RENDER_BODY_BYTES;
}

/**
 * Validate the part of /api/generate-tikz that must run before an upstream call.
 * A successful result includes the route's graph/image mode decision.
 */
export function validateGenerateBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return invalid(400, 'Invalid JSON body');
  }

  const { elements, projectName, image, mode, functions, xRange, yRange } = body;
  if (!elements && !image && !functions) {
    return invalid(400, 'No elements, functions, or image data provided');
  }
  if (projectName !== undefined && (typeof projectName !== 'string' || projectName.length > MAX_NAME_CHARS)) {
    return invalid(400, `Project name must be text under ${MAX_NAME_CHARS} characters.`);
  }

  const isGraph = mode === 'graph' || (!elements && !image && Boolean(functions));
  if (isGraph) {
    if (!Array.isArray(functions) || functions.length === 0) {
      return invalid(400, '`functions` must be a non-empty array');
    }
    if (functions.length > MAX_FUNCTIONS) {
      return invalid(413, `Too many functions to plot (max ${MAX_FUNCTIONS}).`);
    }
    const badExpr = functions.some(
      (fn) => !fn || typeof fn.expr !== 'string' || fn.expr.length > MAX_EXPR_CHARS,
    );
    if (badExpr) {
      return invalid(400, `Each function needs an \`expr\` string under ${MAX_EXPR_CHARS} characters.`);
    }
    if (!isRange(xRange) || !isRange(yRange)) {
      return invalid(400, '`xRange` and `yRange` must each be [min, max] numbers');
    }
  }

  if (typeof image === 'string' && image.length > MAX_IMAGE_CHARS) {
    return invalid(413, 'Image is too large (max 8 MB). Try a smaller or lower-resolution file.');
  }
  if (typeof image === 'string' && !IMAGE_DATA_URL.test(image)) {
    return invalid(400, 'Unsupported image format. Please upload a PNG, JPEG, GIF, WebP, or BMP file.');
  }
  if (elements !== undefined && !Array.isArray(elements)) {
    return invalid(400, '`elements` must be an array.');
  }
  if (Array.isArray(elements) && elements.length > MAX_ELEMENTS) {
    return invalid(413, `This drawing has too many elements to convert (max ${MAX_ELEMENTS}). Try simplifying it.`);
  }

  return { ok: true, isGraph };
}

function isRange(value) {
  return Array.isArray(value)
    && value.length === 2
    && value.every((number) => typeof number === 'number' && Number.isFinite(number));
}

export function findForbiddenTikz(tikzCode) {
  const hit = FORBIDDEN_TEX.find((pattern) => pattern.test(tikzCode));
  return hit ? hit.source.replace(/\\\\/g, '\\').replace(/\\b|\\s\*|\[i\]/g, '') : null;
}

export function validateRenderCode(tikzCode) {
  if (typeof tikzCode !== 'string' || !tikzCode.trim()) {
    return invalid(400, 'No TikZ code provided.');
  }
  if (tikzCode.length > MAX_TIKZ_LENGTH) {
    return invalid(413, `TikZ code is too long (max ${MAX_TIKZ_LENGTH} characters).`);
  }
  const forbidden = findForbiddenTikz(tikzCode);
  if (forbidden) {
    return {
      ...invalid(400, `The renderer does not allow \\${forbidden.replace(/^\\/, '')} in TikZ code.`),
      forbidden,
    };
  }
  return { ok: true };
}
