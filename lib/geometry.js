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

export { BOX_KINDS, CIRC_KINDS, DEFAULT_GEOMETRY, LINE_KINDS, getElementBounds };
