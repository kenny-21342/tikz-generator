/**
 * Element bounding boxes, and the type sets they switch on.
 *
 * Shared by the editor (hit testing, selection outlines) and the TikZ emitter,
 * which needs the bottom of the content box as its Y flip origin. It lived in
 * app/page.js, so extracting the emitter left it calling a function that was no
 * longer in scope -- and `tikzFlipOrigin` swallows exceptions per element, so
 * every diagram would have silently fallen back to a canvas height of 800 and
 * emitted the wrong coordinates, with nothing to show for it but a diagram
 * placed oddly on the page.
 *
 * Pure geometry: canvas pixels in, canvas pixels out.
 */
const BOX_KINDS = new Set([
  "rect", "rounded-rect", "parallelogram", "process", "terminator", "document",
  "and-gate", "or-gate", "not-gate", "nand-gate", "nor-gate", "xor-gate",
  "rhombus", "pentagon", "hexagon", "star", "triangle", "decision",
]);
const CIRC_KINDS = new Set(["circle", "voltmeter", "ammeter", "connector"]);
const LINE_KINDS = new Set(["line", "arrow", "resistor", "capacitor", "inductor", "battery", "diode"]);

function getElementBounds(el, pad = 6) {
  if (BOX_KINDS.has(el.type)) {
    return { x: el.x - pad, y: el.y - pad, width: (el.width || 0) + 2 * pad, height: (el.height || 0) + 2 * pad };
  }
  if (el.type === "text") {
    const w = (el.text?.length || 1) * (el.fontSize || 16) * 0.6;
    const h = el.fontSize || 16;
    return { x: el.x - pad, y: el.y - h - pad, width: w + 2 * pad, height: h + 2 * pad };
  }
  if (CIRC_KINDS.has(el.type)) {
    const r = el.radius || 0;
    return { x: el.x - r - pad, y: el.y - r - pad, width: r * 2 + 2 * pad, height: r * 2 + 2 * pad };
  }
  if (el.type === "ellipse") {
    return { x: el.x - el.rx - pad, y: el.y - el.ry - pad, width: el.rx * 2 + 2 * pad, height: el.ry * 2 + 2 * pad };
  }
  if (LINE_KINDS.has(el.type)) {
    const minX = Math.min(el.x1, el.x2), maxX = Math.max(el.x1, el.x2);
    const minY = Math.min(el.y1, el.y2), maxY = Math.max(el.y1, el.y2);
    return { x: minX - pad - 20, y: minY - pad - 20, width: maxX - minX + 2 * pad + 40, height: maxY - minY + 2 * pad + 40 };
  }
  if (el.type === "pen" || el.type === "sine") {
    if (!el.points?.length) return { x: el.x || 0, y: el.y || 0, width: 10, height: 10 };
    const xs = el.points.map((p) => p.x), ys = el.points.map((p) => p.y);
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, width: Math.max(...xs) - Math.min(...xs) + 2 * pad, height: Math.max(...ys) - Math.min(...ys) + 2 * pad };
  }
  if (el.type === "ground") {
    return { x: el.x - 20 - pad, y: el.y - pad, width: 40 + 2 * pad, height: 35 + 2 * pad };
  }
  if (el.type === "graph") {
    return { x: el.x - pad, y: el.y - pad - 30, width: (el.width || 0) + 2 * pad, height: (el.height || 0) + 2 * pad + 50 };
  }
  return { x: el.x || 0, y: el.y || 0, width: 50, height: 50 };
}

/* Default geometry when placing a shape via click-to-place. */
const DEFAULT_GEOMETRY = {
  rect: { width: 120, height: 80 },
  "rounded-rect": { width: 120, height: 80, cornerRadius: 12 },
  circle: { radius: 50 },
  ellipse: { rx: 70, ry: 45 },
  triangle: { width: 110, height: 95 },
  line: { dx: 120, dy: 0 },
  arrow: { dx: 120, dy: 0 },
  text: { width: 100, height: 30 },
  parallelogram: { width: 120, height: 70 },
  rhombus: { width: 110, height: 80 },
  pentagon: { width: 110, height: 100 },
  hexagon: { width: 110, height: 95 },
  star: { width: 110, height: 110, innerRatio: 0.42 },
  process: { width: 120, height: 60 },
  decision: { width: 120, height: 80 },
  terminator: { width: 120, height: 50 },
  document: { width: 130, height: 80 },
  connector: { radius: 25 },
  resistor: { dx: 120, dy: 0 },
  capacitor: { dx: 80, dy: 0 },
  inductor: { dx: 120, dy: 0 },
  battery: { dx: 80, dy: 0 },
  diode: { dx: 100, dy: 0 },
  ground: {},
  voltmeter: { radius: 30 },
  ammeter: { radius: 30 },
  "and-gate": { width: 80, height: 60 },
  "or-gate": { width: 80, height: 60 },
  "not-gate": { width: 80, height: 60 },
  "nand-gate": { width: 90, height: 60 },
  "nor-gate": { width: 90, height: 60 },
  "xor-gate": { width: 90, height: 60 },
};

/**
 * The point an element rotates about.
 *
 * Every place that inverse-rotates a test point has to use the same centre as
 * the renderer, or a rotated element is drawn in one place and clicked in
 * another. Keeping the definition here means there is one of it.
 *
 * Note that `handleAt` in app/page.js deliberately does NOT use this: resize
 * handles sit on the bounding box, so they rotate about the box centre. For
 * every type except `text` the two agree; for text they differ by half the
 * padding, which is why a rotated text label's handles sit slightly off its
 * outline. See the test that pins this down.
 */
function elementCenter(el) {
  if (LINE_KINDS.has(el.type)) {
    return { cx: (el.x1 + el.x2) / 2, cy: (el.y1 + el.y2) / 2 };
  }
  if (CIRC_KINDS.has(el.type) || el.type === "ellipse") {
    return { cx: el.x, cy: el.y };
  }
  if (el.type === "text") {
    return { cx: el.x, cy: el.y - (el.fontSize || 16) / 2 };
  }
  if ((el.type === "pen" || el.type === "sine") && el.points?.length) {
    const b = getElementBounds(el, 0);
    return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
  }
  return { cx: (el.x || 0) + (el.width || 0) / 2, cy: (el.y || 0) + (el.height || 0) / 2 };
}

/**
 * Is this canvas point on this element, within `tol` canvas units?
 *
 * The editor's hit test. Callers scale `tol` by the zoom so the grab area is a
 * constant number of screen pixels at any magnification.
 */
function isPointInElement(x, y, el, tol = 6) {
  // Inverse-rotate the test point into the element's local (unrotated) frame.
  if (el.rotation) {
    const { cx, cy } = elementCenter(el);
    const rad = (-el.rotation * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const rx = cx + (x - cx) * cos - (y - cy) * sin;
    const ry = cy + (x - cx) * sin + (y - cy) * cos;
    x = rx; y = ry;
  }

  if (BOX_KINDS.has(el.type)) {
    return x >= el.x - tol && x <= el.x + (el.width || 0) + tol &&
           y >= el.y - tol && y <= el.y + (el.height || 0) + tol;
  }
  if (CIRC_KINDS.has(el.type)) {
    return Math.hypot(x - el.x, y - el.y) <= (el.radius || 0) + tol;
  }
  if (el.type === "ellipse") {
    const dx = (x - el.x) / (el.rx || 1);
    const dy = (y - el.y) / (el.ry || 1);
    return Math.hypot(dx, dy) <= 1 + tol / Math.max(el.rx || 1, el.ry || 1);
  }
  if (LINE_KINDS.has(el.type)) {
    const lx = el.x2 - el.x1, ly = el.y2 - el.y1;
    const len = Math.hypot(lx, ly);
    if (len === 0) return Math.hypot(x - el.x1, y - el.y1) <= tol;
    const t = Math.max(0, Math.min(1, ((x - el.x1) * lx + (y - el.y1) * ly) / (len * len)));
    return Math.hypot(x - (el.x1 + t * lx), y - (el.y1 + t * ly)) <= tol + (el.lineWidth || 2) / 2;
  }
  if (el.type === "pen" || el.type === "sine") {
    if (!el.points || !el.points.length) return false;
    return el.points.some((p) => Math.hypot(x - p.x, y - p.y) <= tol + (el.lineWidth || 2));
  }
  if (el.type === "text") {
    const w = (el.text?.length || 1) * (el.fontSize || 16) * 0.6;
    const h = el.fontSize || 16;
    return x >= el.x - tol && x <= el.x + w + tol && y >= el.y - h - tol && y <= el.y + tol;
  }
  if (el.type === "ground") {
    return x >= el.x - 20 - tol && x <= el.x + 20 + tol && y >= el.y - tol && y <= el.y + 35 + tol;
  }
  if (el.type === "graph") {
    return x >= el.x - tol && x <= el.x + (el.width || 0) + tol &&
           y >= el.y - tol && y <= el.y + (el.height || 0) + tol;
  }
  return false;
}

/**
 * Clamp an axis range into something plottable: two finite numbers, ascending.
 *
 * Shared by the canvas renderer, the range inputs and the TikZ emitter, so a
 * range that is safe to draw is by construction safe to export.
 */
function safeRange(range, fallback) {
  const [fa, fb] = fallback;
  // Note Number("") === 0, so only actual numbers count as supplied.
  const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : NaN);
  let a = num(Array.isArray(range) ? range[0] : NaN);
  let b = num(Array.isArray(range) ? range[1] : NaN);
  if (!Number.isFinite(a)) a = fa;
  if (!Number.isFinite(b)) b = fb;
  if (b <= a) b = a + Math.max(1e-6, Math.abs(a) * 1e-6 || 1e-6);
  return [a, b];
}

export {
  BOX_KINDS, CIRC_KINDS, DEFAULT_GEOMETRY, LINE_KINDS,
  elementCenter, getElementBounds, isPointInElement, safeRange,
};
