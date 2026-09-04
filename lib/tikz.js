/**
 * The deterministic TikZ emitter: element objects in, compile-ready TikZ out.
 *
 * Lifted out of app/page.js for the same reason as the parser -- this is the
 * product. Every drawing tool in the editor ends here, and until now it could
 * only be checked by drawing a shape and reading the output by eye.
 *
 * Pure: no DOM, no React, no canvas. `H` is the flip origin from
 * `tikzFlipOrigin`, not the canvas height, so the same diagram emits the same
 * coordinates whatever size the window is.
 */
import { toPgfExpr } from "./expr.js";
import { BOX_KINDS, CIRC_KINDS, DEFAULT_GEOMETRY, getElementBounds, safeRange } from "./geometry.js";

// Canvas pixels → TikZ units (cm). 50px ≈ 1cm.
const TIKZ_SCALE = 50;
// Canvas pixels are 1/TIKZ_SCALE of a TikZ unit (cm). 1cm = 28.4527pt, so a font
// measured in canvas pixels converts to points with this factor.
const PT_PER_CANVAS_PX = 28.4527 / TIKZ_SCALE;
const sx = (v) => (Number.isFinite(v) ? v / TIKZ_SCALE : 0).toFixed(2);
// Y is flipped. `H` is the flip origin in canvas pixels — the bottom of the content
// bounding box (see tikzFlipOrigin), NOT the live canvas height, so that the same
// diagram emits the same coordinates regardless of window size.
const sy = (y, H) => ((H - (Number.isFinite(y) ? y : 0)) / TIKZ_SCALE).toFixed(2);

// Escape text that will be typeset by LaTeX in text mode. Without this, a label
// containing % & _ # $ { } ~ ^ or a backslash is a hard compilation error.
const TEX_ESCAPES = {
  "\\": "\\textbackslash{}",
  "~": "\\textasciitilde{}",
  "^": "\\textasciicircum{}",
  "#": "\\#", $: "\\$", "%": "\\%", "&": "\\&", _: "\\_", "{": "\\{", "}": "\\}",
};
function texEscape(value) {
  return String(value ?? "").replace(/[\\~^#$%&_{}]/g, (ch) => TEX_ESCAPES[ch]);
}

function hexToRgb(hex) {
  let h = String(hex || "").trim().replace(/^#/, "");
  // Expand 3-digit shorthand (#f00 -> ff0000); anything unparseable falls back to black.
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = "000000";
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function rgbTex(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `{rgb,255:red,${r};green,${g};blue,${b}}`;
}

// Join TikZ option fragments, dropping empties so we never emit `[draw, , circle]`.
const opts = (...parts) => parts.filter((p) => p != null && String(p).trim() !== "").join(", ");

function styleStr(el) {
  const parts = [];
  if (el.lineWidth) parts.push(`line width=${(el.lineWidth * 0.4).toFixed(1)}pt`);
  if (el.strokeColor) parts.push(`draw=${rgbTex(el.strokeColor)}`);
  if (el.isDashed) parts.push("dashed");
  if (el.fillColor && el.fillColor !== "transparent") {
    parts.push(`fill=${rgbTex(el.fillColor)}`);
    if (el.fillOpacity != null && el.fillOpacity < 1) parts.push(`fill opacity=${el.fillOpacity.toFixed(2)}, text opacity=1`);
  }
  return parts.join(", ");
}

function nodeOpts(el, H, extra = "") {
  const geo = ["draw", "line width=" + ((el.lineWidth || 2) * 0.4).toFixed(1) + "pt"];
  if (el.strokeColor) geo.push("draw=" + rgbTex(el.strokeColor));
  if (el.isDashed) geo.push("dashed");
  if (el.fillColor && el.fillColor !== "transparent") {
    geo.push("fill=" + rgbTex(el.fillColor));
    if (el.fillOpacity != null && el.fillOpacity < 1) geo.push("fill opacity=" + el.fillOpacity.toFixed(2));
  }
  if (el.rotation) geo.push(`rotate around={${el.rotation}:(${sx(el.x + (el.width || 0) / 2)},${sy(el.y + (el.height || 0) / 2, H)})}`);
  if (extra) geo.push(extra);
  return geo.join(", ");
}

function drawOpts(el, H) {
  const parts = [];
  if (el.lineWidth) parts.push(`line width=${(el.lineWidth * 0.4).toFixed(1)}pt`);
  if (el.strokeColor) parts.push(`draw=${rgbTex(el.strokeColor)}`);
  if (el.isDashed) parts.push("dashed");
  if (el.fillColor && el.fillColor !== "transparent") {
    parts.push(`fill=${rgbTex(el.fillColor)}`);
    if (el.fillOpacity != null && el.fillOpacity < 1) parts.push(`fill opacity=${el.fillOpacity.toFixed(2)}`);
  }
  if (el.hasArrow) parts.push("-Stealth");
  if (el.rotation) {
    // Mirror the canvas rotation center for each element kind.
    let cx, cy;
    if (el.x1 !== undefined && el.x2 !== undefined) {
      cx = (el.x1 + el.x2) / 2;
      cy = (el.y1 + el.y2) / 2;
    } else if (CIRC_KINDS.has(el.type) || el.type === "ellipse") {
      cx = el.x;
      cy = el.y;
    } else if (el.type === "text") {
      cx = el.x;
      cy = el.y - (el.fontSize || 16) / 2;
    } else if ((el.type === "pen" || el.type === "sine") && el.points?.length) {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    } else {
      cx = (el.x || 0) + (el.width || 0) / 2;
      cy = (el.y || 0) + (el.height || 0) / 2;
    }
    parts.push(`rotate around={${el.rotation}:(${sx(cx)},${sy(cy, H || 800)})}`);
  }
  return parts.join(", ");
}

const SHAPE_TO_NODE = {
  "rounded-rect": "rounded corners",
  "process": "draw, rounded corners=2pt",
  "decision": "diamond",
  "terminator": "rounded corners=10pt",
  "rhombus": "diamond",
  "pentagon": "regular polygon, regular polygon sides=5",
  "hexagon": "regular polygon, regular polygon sides=6",
  "star": "star, star points=5",
  "triangle": "regular polygon, regular polygon sides=3",
  "parallelogram": "trapezium, trapezium left angle=70, trapezium right angle=110",
  "document": "tape",
};

const GATE_TEX = {
  "and-gate": "american and port",
  "or-gate": "american or port",
  "not-gate": "american not port",
  "nand-gate": "american nand port",
  "nor-gate": "american nor port",
  "xor-gate": "american xor port",
};

function genElement(el, H) {
  if (!el || !el.type) return "";
  const t = el.type;

  // TEXT
  if (t === "text") {
    // isLatex content is the user's own math source and is passed through, but braced
    // so an unbalanced $ cannot swallow the rest of the picture.
    const content = el.isLatex ? `{$${el.text ?? ""}$}` : texEscape(el.text || "Label");
    const fam = el.fontFamily === "serif" || el.fontFamily === "Times New Roman" ? "\\rmfamily" :
               el.fontFamily === "monospace" || el.fontFamily === "Courier New" ? "\\ttfamily" : "\\sffamily";
    // Canvas px -> pt, so text scales with the same factor as the coordinates.
    const fs = Math.max(4, (el.fontSize || 18) * PT_PER_CANVAS_PX);
    const fsStr = fs.toFixed(1), skipStr = (fs * 1.2).toFixed(1);
    return `  \\node[${opts(
      "anchor=base west",
      `font={${fam}\\fontsize{${fsStr}}{${skipStr}}\\selectfont}`,
      `text=${rgbTex(el.strokeColor || "#000000")}`,
      el.rotation ? `rotate=${el.rotation}` : "",
    )}] at (${sx(el.x)},${sy(el.y, H)}) {${content}};`;
  }

  // CIRCLES
  if (CIRC_KINDS.has(t) || t === "circle") {
    const r = Number.isFinite(el.radius) ? el.radius : 25;
    const meter = (letter) =>
      `  \\draw (${sx(el.x)},${sy(el.y, H)}) node[${opts("draw", styleStr(el), "circle", `minimum size=${sx(r * 2)} cm`)}] {${letter}};`;
    if (t === "voltmeter") return meter("V");
    if (t === "ammeter") return meter("A");
    if (t === "connector") return `  \\node[${opts("draw", styleStr(el), "circle", `minimum size=${sx(r * 2)} cm`)}] at (${sx(el.x)},${sy(el.y, H)}) {};`;
    return `  \\draw[${drawOpts(el, H)}] (${sx(el.x)},${sy(el.y, H)}) circle (${sx(r)});`;
  }

  // ELLIPSE
  if (t === "ellipse") {
    return `  \\draw[${drawOpts(el, H)}] (${sx(el.x)},${sy(el.y, H)}) ellipse ({${sx(el.rx)}} and {${sx(el.ry)}});`;
  }

  // LINES & ARROWS
  if (t === "line" || t === "arrow") {
    const opt = drawOpts(el, H);
    return `  \\draw[${opt}] (${sx(el.x1)},${sy(el.y1, H)}) -- (${sx(el.x2)},${sy(el.y2, H)});`;
  }

  // CIRCUIT COMPONENTS (CircuiTikZ)
  const circMap = { resistor: "R", capacitor: "C", inductor: "L", battery: "battery", diode: "D" };
  if (circMap[t]) {
    return `  \\draw (${sx(el.x1)},${sy(el.y1, H)}) to[${opts(circMap[t], styleStr(el))}] (${sx(el.x2)},${sy(el.y2, H)});`;
  }
  if (t === "ground") {
    return `  \\draw (${sx(el.x)},${sy(el.y, H)}) node[ground] {};`;
  }

  // LOGIC GATES (circuitikz node shapes — require \usepackage{circuitikz})
  if (GATE_TEX[t]) {
    const g = DEFAULT_GEOMETRY[t] || {};
    const w = Number.isFinite(el.width) ? el.width : (g.width || 80);
    const h = Number.isFinite(el.height) ? el.height : (g.height || 60);
    return `  \\node[${opts(GATE_TEX[t], styleStr(el))}] at (${sx(el.x + w / 2)},${sy(el.y + h / 2, H)}) {};`;
  }

  // PEN STROKES → series of line segments
  if (t === "pen" && el.points && el.points.length > 1) {
    const hasPressure = !el.isDashed && el.points.some((point) => Number.isFinite(point.pressure));
    if (hasPressure) {
      return el.points.slice(1).map((point, index) => {
        const previous = el.points[index];
        const pressure = ((previous.pressure ?? 0.5) + (point.pressure ?? 0.5)) / 2;
        const segment = {
          ...el,
          lineWidth: (el.lineWidth || 2) * (0.5 + pressure),
        };
        return `  \\draw[${drawOpts(segment, H)}] (${sx(previous.x)},${sy(previous.y, H)}) -- (${sx(point.x)},${sy(point.y, H)});`;
      }).join("\n");
    }
    const opt = drawOpts(el, H);
    const pts = el.points.map((p) => `(${sx(p.x)},${sy(p.y, H)})`).join(" -- ");
    return `  \\draw[${opt}] ${pts};`;
  }

  // BOX-LIKE SHAPES → use \node with shape geometry
  if (BOX_KINDS.has(t)) {
    const g = DEFAULT_GEOMETRY[t] || {};
    const w = Number.isFinite(el.width) ? el.width : (g.width || 100);
    const h = Number.isFinite(el.height) ? el.height : (g.height || 70);
    const bx = el.x + w / 2, by = el.y + h / 2;
    const shapeOpt = SHAPE_TO_NODE[t];
    if (shapeOpt) {
      const isCornerType = t === "rounded-rect" || t === "terminator";
      const opt = isCornerType
        ? nodeOpts(el, H, `rounded corners`)
        : opts(
            "draw",
            `line width=${((el.lineWidth || 2) * 0.4).toFixed(1)}pt`,
            el.strokeColor ? `draw=${rgbTex(el.strokeColor)}` : "",
            el.isDashed ? "dashed" : "",
            el.fillColor && el.fillColor !== "transparent" ? `fill=${rgbTex(el.fillColor)}` : "",
            shapeOpt,
            `minimum width=${sx(w)} cm`,
            `minimum height=${sx(h)} cm`,
            el.rotation ? `rotate=${el.rotation}` : "",
          );
      return `  \\node[${opt}] at (${sx(bx)},${sy(by, H)}) {};`;
    }
    // plain rectangle
    return `  \\draw[${drawOpts(el, H)}] (${sx(el.x)},${sy(el.y, H)}) rectangle (${sx(el.x + w)},${sy(el.y + h, H)});`;
  }

  return `  % unsupported: ${t}`;
}

// The Y-flip origin, in canvas pixels. Derived from the content bounding box rather
// than the live canvas height so that resizing the window, toggling a panel, or opening
// the output dock never changes the emitted coordinates.
function tikzFlipOrigin(elements, fallback) {
  let maxY = -Infinity;
  for (const el of elements || []) {
    try {
      const b = getElementBounds(el, 0);
      if (Number.isFinite(b.y) && Number.isFinite(b.height)) maxY = Math.max(maxY, b.y + b.height);
    } catch { /* skip malformed element */ }
  }
  if (!Number.isFinite(maxY)) return fallback || 800;
  // Round to a whole grid step so tiny sub-pixel drags don't churn every coordinate.
  return Math.ceil(maxY / 20) * 20;
}

const CIRCUIT_TYPES = new Set([
  "resistor", "capacitor", "inductor", "battery", "diode",
  "ground", "voltmeter", "ammeter",
]);

/**
 * Make a string safe to sit on a `%` comment line.
 *
 * A project name is loaded from a .tikz.json file, and it went into the header
 * comment verbatim. A newline in it therefore ended the comment, and everything
 * after it became live TikZ in code the user copies out and compiles -- so a
 * shared project file could carry `\\immediate\\write18{...}` into someone
 * else's LaTeX run. Newlines are stripped rather than escaped: there is no
 * escape for them inside a comment, and a name is a single line anyway.
 *
 * Trimmed to a sane length too, so a 4MB name cannot be smuggled through the
 * header either.
 */
function commentSafe(value) {
  return String(value ?? "")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .trim()
    .slice(0, 200);
}

function generateTikzLocal(state) {
  const { mode, elements, functions, xRange, yRange, graphConfig, projectName, canvasHeight } = state;
  const H = mode === "graph" ? (canvasHeight || 800) : tikzFlipOrigin(elements, canvasHeight);
  const lines = [];
  lines.push(`% Auto-generated by TikZ Studio — ${commentSafe(projectName) || "Untitled"}`);

  // Determine which libraries are needed
  const needs = { shapes: false, shapeSymbols: false, arrows: false, circuits: false, pgfplots: false };
  if (mode === "graph") { needs.pgfplots = true; }
  else {
    for (const el of elements) {
      // Logic gates use circuitikz node shapes, so they need the package too.
      if (CIRCUIT_TYPES.has(el.type) || GATE_TEX[el.type]) needs.circuits = true;
      if (["rounded-rect","decision","terminator","rhombus","pentagon","hexagon","star","triangle","parallelogram","process","document"].includes(el.type)) needs.shapes = true;
      if (el.type === "document") needs.shapeSymbols = true; // `tape` lives in shapes.symbols
      if (el.hasArrow || el.type === "arrow") needs.arrows = true;
    }
  }

  lines.push("\\begin{tikzpicture}");
  if (mode === "graph") {
    const cfg = graphConfig || {};
    const [xMin, xMax] = safeRange(xRange, [-10, 10]);
    const [yMin, yMax] = safeRange(yRange, [-6, 6]);
    const gridOpt = { none: "", major: "grid=major", minor: "grid=minor", both: "grid=both" };
    const ax = opts(
      `xmin=${xMin}`, `xmax=${xMax}`, `ymin=${yMin}`, `ymax=${yMax}`,
      cfg.xLabel ? `xlabel={${texEscape(cfg.xLabel)}}` : "",
      cfg.yLabel ? `ylabel={${texEscape(cfg.yLabel)}}` : "",
      cfg.title ? `title={${texEscape(cfg.title)}}` : "",
      gridOpt[cfg.gridStyle] ?? "grid=both",
      cfg.showMajorTicks === false ? "xtick=\\empty, ytick=\\empty" : "",
      cfg.showMinorTicks ? "minor tick num=4" : "",
      cfg.showLegend ? `legend pos=${cfg.legendPosition || "north east"}` : "",
      cfg.showDataLabels ? "nodes near coords" : "",
      "axis lines=middle", "samples=200",
    );
    lines.push(`\\begin{axis}[${ax}]`);
    (functions || []).filter((f) => f.visible && (f.expr || "").trim()).forEach((f) => {
      // The canvas evaluates expressions with JS semantics (radians, log = log10,
      // implicit multiplication). pgfmath does not — translate before emitting.
      let expr;
      try {
        expr = toPgfExpr(f.expr);
      } catch (err) {
        // commentSafe, not just texEscape: this is a comment line, and
        // texEscape does not touch newlines. A function expression carrying one
        // reaches exactly this path, because the tokenizer rejects it -- so the
        // error message for a bad expression was itself a way to break out of
        // the comment and inject TikZ.
        lines.push(`  % skipped ${commentSafe(texEscape(f.expr))} — ${commentSafe(texEscape(err.message))}`);
        return;
      }
      lines.push(`  \\addplot[domain=${xMin}:${xMax}, color=${rgbTex(f.color)}, thick] {${expr}};`);
      if (cfg.showLegend) {
        // Legend text is typeset in text mode, so escape it rather than assuming math.
        lines.push(`  \\addlegendentry{${texEscape(f.expr)}}`);
      }
    });
    lines.push("\\end{axis}");
  } else {
    for (const el of elements) {
      const code = genElement(el, H);
      if (code) lines.push(code);
    }
  }
  lines.push("\\end{tikzpicture}");

  // Return ONLY the tikzpicture environment — \usepackage / \usetikzlibrary
  // cannot appear inside \begin{document}. The render route and copy-paste
  // users add their own preamble. We note requirements as comments only.
  const reqs = [];
  if (needs.pgfplots) reqs.push("pgfplots");
  if (needs.circuits) reqs.push("circuitikz");
  if (needs.shapes) reqs.push("shapes.geometric", "shapes.misc");
  if (needs.shapeSymbols) reqs.push("shapes.symbols");
  if (needs.arrows) reqs.push("arrows.meta");
  const comment = reqs.length ? `% Requires: ${reqs.join(", ")}\n` : "";

  return { code: comment + lines.join("\n"), reqs };
}

export {
  PT_PER_CANVAS_PX,
  commentSafe,
  TIKZ_SCALE,
  drawOpts,
  genElement,
  generateTikzLocal,
  hexToRgb,
  rgbTex,
  styleStr,
  sx,
  sy,
  texEscape,
  tikzFlipOrigin,
};
