"use client";
import { useRef, useState, useEffect, useMemo, useCallback } from "react";

/* =========================================================================
 * SHAPE REGISTRY
 * Each entry describes a placeable shape for the Visio-style left library.
 * `kind` matches the element `type` used throughout the canvas engine.
 * `glyph` is a small inline SVG preview shown in the stencil grid.
 * `category` groups shapes into tabs in the left panel.
 * ========================================================================= */

const Glyph = ({ children }) => (
  <svg viewBox="0 0 40 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
    {children}
  </svg>
);

/* Inline SVG icon set (Feather-like, minimal). Usage: <Icon name="pointer" /> */
const ICON_PATHS = {
  pointer: <><path d="M5 3l14 8-6 1-1 6-7-15z" /></>,
  pen: <><path d="M16 3l5 5L8 21H3v-5L16 3z" /></>,
  text: <><path d="M4 6V4h16v2M12 4v16M9 20h6" /></>,
  eraser: <><path d="M16 3l5 5-9 9H6l-3-3 9-9z M8 21h13" /></>,
  shapes: <><path d="M3 4h7v7H3z" /><circle cx="17.5" cy="7.5" r="3.5" /><path d="M14 21l4-7 4 7z" /></>,
  undo: <><path d="M9 14L4 9l5-5 M4 9h11a6 6 0 010 12h-4" /></>,
  redo: <><path d="M15 14l5-5-5-5 M20 9H9a6 6 0 000 12h4" /></>,
  trash: <><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14" /></>,
  save: <><path d="M5 3h11l3 3v15H5z M8 3v6h8V3 M8 14h8v7H8z" /></>,
  open: <><path d="M3 7h7l2 2h9v10H3z" /></>,
  image: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 17l-5-5-6 6" /></>,
  code: <><path d="M8 7l-5 5 5 5 M16 7l5 5-5 5 M13 4l-2 16" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4V4h11v1" /></>,
  play: <><path d="M6 4l14 8-14 8z" /></>,
  panelRight: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>,
  sparkles: <><path d="M12 3v6M9 6h6 M6 12l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z M18 11l.7 2.3L21 14l-2.3.7L18 17l-.7-2.3L15 14l2.3-.7z" /></>,
  download: <><path d="M12 3v12 M7 11l5 4 5-4 M5 21h14" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  upload: <><path d="M12 20V8 M7 13l5-5 5 5 M5 4h14" /></>,
};
const Icon = ({ name, className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {ICON_PATHS[name] || null}
  </svg>
);

const SHAPES = [
  // Basic
  { kind: "rect", label: "Rectangle", category: "Basic", glyph: <rect x="5" y="5" width="30" height="18" rx="1" /> },
  { kind: "rounded-rect", label: "Round Rect", category: "Basic", glyph: <rect x="5" y="5" width="30" height="18" rx="5" /> },
  { kind: "circle", label: "Circle", category: "Basic", glyph: <circle cx="20" cy="14" r="10" /> },
  { kind: "ellipse", label: "Ellipse", category: "Basic", glyph: <ellipse cx="20" cy="14" rx="13" ry="8" /> },
  { kind: "triangle", label: "Triangle", category: "Basic", glyph: <path d="M20 4 L35 23 L5 23 Z" /> },
  { kind: "line", label: "Line", category: "Basic", glyph: <path d="M5 22 L35 6" /> },
  { kind: "arrow", label: "Arrow", category: "Basic", glyph: <><path d="M5 22 L30 8" /><path d="M30 8 L24 9 M30 8 L29 14" /></> },
  { kind: "text", label: "Text", category: "Basic", glyph: <><path d="M8 7 H32" /><path d="M20 7 V22" /></> },

  // Polygons
  { kind: "parallelogram", label: "Parallelogram", category: "Polygons", glyph: <path d="M9 5 H35 L31 23 H5 Z" /> },
  { kind: "rhombus", label: "Diamond", category: "Polygons", glyph: <path d="M20 3 L37 14 L20 25 L3 14 Z" /> },
  { kind: "pentagon", label: "Pentagon", category: "Polygons", glyph: <path d="M20 3 L37 15 L30 25 L10 25 L3 15 Z" /> },
  { kind: "hexagon", label: "Hexagon", category: "Polygons", glyph: <path d="M11 4 H29 L38 14 L29 24 H11 L2 14 Z" /> },
  { kind: "star", label: "Star", category: "Polygons", glyph: <path d="M20 3 L24 11 L33 12 L26 18 L28 26 L20 22 L12 26 L14 18 L7 12 L16 11 Z" /> },

  // Flowchart
  { kind: "process", label: "Process", category: "Flowchart", glyph: <rect x="5" y="6" width="30" height="16" rx="1" /> },
  { kind: "decision", label: "Decision", category: "Flowchart", glyph: <path d="M20 4 L36 14 L20 24 L4 14 Z" /> },
  { kind: "terminator", label: "Start/End", category: "Flowchart", glyph: <rect x="4" y="7" width="32" height="14" rx="7" /> },
  { kind: "document", label: "Document", category: "Flowchart", glyph: <path d="M5 5 H35 V21 Q20 27 5 21 Z" /> },
  { kind: "connector", label: "Connector", category: "Flowchart", glyph: <circle cx="20" cy="14" r="6" /> },

  // Circuit
  { kind: "resistor", label: "Resistor", category: "Circuit", glyph: <><path d="M3 14 H10" /><path d="M10 14 L12 9 L16 19 L20 9 L24 19 L28 9 L30 14" /><path d="M30 14 H37" /></> },
  { kind: "capacitor", label: "Capacitor", category: "Circuit", glyph: <><path d="M3 14 H17" /><path d="M17 6 V22" /><path d="M23 6 V22" /><path d="M23 14 H37" /></> },
  { kind: "inductor", label: "Inductor", category: "Circuit", glyph: <><path d="M3 14 H10" /><path d="M10 14 A4 4 0 0 1 18 14 A4 4 0 0 1 26 14 A4 4 0 0 1 34 14" /><path d="M34 14 H37" /></> },
  { kind: "battery", label: "Battery", category: "Circuit", glyph: <><path d="M3 14 H16" /><path d="M16 6 V22" /><path d="M20 9 V19" /><path d="M24 6 V22" /><path d="M28 9 V19" /><path d="M28 14 H37" /></> },
  { kind: "diode", label: "Diode", category: "Circuit", glyph: <><path d="M3 14 H14" /><path d="M14 7 L14 21 L26 14 Z" /><path d="M26 7 L26 21" /><path d="M26 14 H37" /></> },
  { kind: "ground", label: "Ground", category: "Circuit", glyph: <><path d="M20 4 V14" /><path d="M10 14 H30" /><path d="M13 19 H27" /><path d="M16 24 H24" /></> },
  { kind: "voltmeter", label: "Voltmeter", category: "Circuit", glyph: <><circle cx="20" cy="14" r="9" /><path d="M16 10 L18 18 L24 12" /></> },
  { kind: "ammeter", label: "Ammeter", category: "Circuit", glyph: <><circle cx="20" cy="14" r="9" /><path d="M14 14 H26" /></> },

  // Logic Gates
  { kind: "and-gate", label: "AND", category: "Logic Gates", glyph: <><path d="M6 6 H18 A8 8 0 0 1 18 22 H6 Z" /><path d="M2 10 H6 M2 18 H6 M26 14 H32" /></> },
  { kind: "or-gate", label: "OR", category: "Logic Gates", glyph: <><path d="M5 6 Q14 14 5 22 Q16 22 26 14 Q16 6 5 6 Z" /><path d="M2 10 H8 M2 18 H8 M26 14 H32" /></> },
  { kind: "not-gate", label: "NOT", category: "Logic Gates", glyph: <><path d="M6 6 L24 14 L6 22 Z" /><circle cx="27" cy="14" r="2" /><path d="M2 14 H6 M29 14 H34" /></> },
  { kind: "nand-gate", label: "NAND", category: "Logic Gates", glyph: <><path d="M6 6 H16 A7 7 0 0 1 16 22 H6 Z" /><circle cx="26" cy="14" r="2" /><path d="M2 10 H6 M2 18 H6 M28 14 H34" /></> },
  { kind: "nor-gate", label: "NOR", category: "Logic Gates", glyph: <><path d="M5 6 Q12 14 5 22 Q14 22 22 14 Q14 6 5 6 Z" /><circle cx="25" cy="14" r="2" /><path d="M2 10 H8 M2 18 H8 M27 14 H34" /></> },
  { kind: "xor-gate", label: "XOR", category: "Logic Gates", glyph: <><path d="M4 6 Q11 14 4 22" /><path d="M7 6 Q16 14 7 22 Q17 22 25 14 Q17 6 7 6 Z" /><path d="M2 10 H6 M2 18 H6 M27 14 H34" /></> },
];

const CATEGORIES = ["Basic", "Polygons", "Flowchart", "Circuit", "Logic Gates"];

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

const CATEGORY_ICON = {
  Basic: "▦",
  Polygons: "◆",
  Flowchart: "⤳",
  Circuit: "⚡",
  "Logic Gates": "⊲",
};

const COLOR_PRESETS = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#64748b", "#475569", "#1e293b", "#fde68a", "#bbf7d0",
];

const PLACEHOLDER_TOOL = "__place__";

/* =========================================================================
 * SAFE MATH PARSER (tokenizer + shunting-yard + RPN eval)
 * Used by the Desmos-style graphing mode so users can type `sin(x) + 0.5*x^2`
 * without relying on eval(). Supports + - * / ^, parentheses, unary minus,
 * implicit multiplication (2x, 3sin(x)), and common functions / constants.
 * ========================================================================= */

const MATH_FUNCS = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan,
  asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
  exp: Math.exp, ln: Math.log, log: Math.log10, log10: Math.log10, log2: Math.log2,
  floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign,
};
const MATH_CONSTS = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

function tokenizeExpr(expr) {
  const tokens = [];
  let i = 0;
  const isDigit = (c) => /[0-9.]/.test(c);
  const isAlpha = (c) => /[a-zA-Z]/.test(c);
  while (i < expr.length) {
    const c = expr[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (isDigit(c)) {
      let num = "";
      while (i < expr.length && isDigit(expr[i])) num += expr[i++];
      tokens.push({ t: "num", v: parseFloat(num) });
      continue;
    }
    if (isAlpha(c)) {
      let name = "";
      while (i < expr.length && isAlpha(expr[i])) name += expr[i++];
      tokens.push({ t: "name", v: name });
      continue;
    }
    if ("+-*/^()".includes(c)) { tokens.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Unexpected character '${c}'`);
  }
  return tokens;
}

const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3, u: 4 };
const RIGHT = { "^": true, u: true };

function toRPN(tokens) {
  const out = [];
  const ops = [];
  let prev = null;
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === "num" || tk.t === "name") {
      // Function name directly followed by "(" => function-call operator.
      // The argument is already evaluated when this operator is emitted.
      const next = tokens[i + 1];
      if (
        tk.t === "name" &&
        MATH_FUNCS[tk.v] &&
        next &&
        next.t === "op" &&
        next.v === "("
      ) {
        ops.push({ t: "op", v: "f", fn: tk.v, prec: 5 });
        prev = tk;
        continue;
      }
      out.push(tk);
    } else if (tk.t === "op") {
      if (tk.v === "(") {
        ops.push(tk);
      } else if (tk.v === ")") {
        while (ops.length && ops[ops.length - 1].v !== "(") out.push(ops.pop());
        if (!ops.length) throw new Error("Mismatched parentheses");
        ops.pop(); // pop "("
      } else {
        const isUnary =
          tk.v === "-" && (prev === null || (prev.t === "op" && prev.v !== ")"));
        // At the start of an expression (or right after "(") rewrite unary
        // minus as 0 - expr so that -x^2 evaluates as -(x^2), matching the
        // Desmos/Python convention. Elsewhere (x^-2, x*-2) keep the "u"
        // operator so the negation binds to the immediate operand.
        const leadingUnary =
          isUnary && (prev === null || (prev.t === "op" && prev.v === "("));
        if (leadingUnary) out.push({ t: "num", v: 0 });
        const op = leadingUnary ? "-" : isUnary ? "u" : tk.v;
        const prec = PREC[op];
        while (ops.length) {
          const top = ops[ops.length - 1];
          if (top.v === "(") break;
          const topPrec = top.prec !== undefined ? top.prec : PREC[top.v];
          if (topPrec !== undefined && prec !== undefined) {
            const shouldPop = RIGHT[op] ? prec < topPrec : prec <= topPrec;
            if (shouldPop) {
              out.push(ops.pop());
              continue;
            }
          }
          break;
        }
        ops.push({ t: "op", v: op, prec });
      }
    }
    prev = tk;
  }
  while (ops.length) {
    const o = ops.pop();
    if (o.v === "(") throw new Error("Mismatched parentheses");
    out.push(o);
  }
  return out;
}

function evalRPN(rpn, x) {
  const st = [];
  for (const tk of rpn) {
    if (tk.t === "num") { st.push(tk.v); continue; }
    if (tk.t === "name") {
      if (tk.v === "x") { st.push(x); continue; }
      if (MATH_CONSTS[tk.v] !== undefined) { st.push(MATH_CONSTS[tk.v]); continue; }
      throw new Error(`Unknown identifier '${tk.v}'`);
    }
    if (tk.t === "op") {
      if (tk.v === "f") {
        const a = st.pop();
        if (a === undefined) throw new Error("Invalid expression");
        st.push(MATH_FUNCS[tk.fn](a));
        continue;
      }
      if (tk.v === "u") {
        const a = st.pop();
        if (a === undefined) throw new Error("Invalid expression");
        st.push(-a);
        continue;
      }
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new Error("Invalid expression");
      if (tk.v === "^") st.push(Math.pow(a, b));
      else if (tk.v === "+") st.push(a + b);
      else if (tk.v === "-") st.push(a - b);
      else if (tk.v === "*") st.push(a * b);
      else if (tk.v === "/") st.push(a / b);
      else throw new Error(`Unknown operator '${tk.v}'`);
    }
  }
  if (st.length !== 1 || typeof st[0] !== "number") throw new Error("Invalid expression");
  return st[0];
}

// Tokenize, insert implicit multiplication, and convert to RPN.
function parseExpr(expr) {
  const tokens = tokenizeExpr(expr);
  // implicit multiplication: number/name followed by name/(
  const inserted = [];
  for (let i = 0; i < tokens.length; i++) {
    inserted.push(tokens[i]);
    const cur = tokens[i];
    const nxt = tokens[i + 1];
    if (!nxt) continue;
    const curEnd = cur.t === "num" || cur.t === "name" || (cur.t === "op" && cur.v === ")");
    const nxtStart = nxt.t === "name" || (nxt.t === "op" && nxt.v === "(");
    if (curEnd && nxtStart && !(cur.t === "name" && MATH_FUNCS[cur.v])) {
      inserted.push({ t: "op", v: "*" });
    }
  }
  return toRPN(inserted);
}

// Compile to a reusable JS function for the on-canvas preview.
function compileFn(expr) {
  const rpn = parseExpr(expr);
  return (x) => {
    try {
      return evalRPN(rpn, x);
    } catch {
      return NaN;
    }
  };
}

/* -------------------------------------------------------------------------
 * pgfmath emitter.
 *
 * The canvas evaluates with JavaScript semantics; pgfplots does not. The two
 * disagree in ways that silently produce a *different curve* rather than an
 * error, most importantly: pgfmath's trig functions take DEGREES. This walks
 * the same RPN the canvas uses and re-emits fully-parenthesised pgfmath, so
 * the compiled plot matches the preview.
 * ------------------------------------------------------------------------- */
const PGF_FUNCS = {
  // Trig: pgfmath works in degrees, JS in radians.
  sin: (a) => `sin(deg(${a}))`,
  cos: (a) => `cos(deg(${a}))`,
  tan: (a) => `tan(deg(${a}))`,
  // ...and the inverses return degrees, so convert back.
  asin: (a) => `rad(asin(${a}))`,
  acos: (a) => `rad(acos(${a}))`,
  atan: (a) => `rad(atan(${a}))`,
  sinh: (a) => `sinh(${a})`,
  cosh: (a) => `cosh(${a})`,
  tanh: (a) => `tanh(${a})`,
  sqrt: (a) => `sqrt(${a})`,
  cbrt: (a) => `(${a})^(1/3)`,     // no cbrt in pgfmath
  abs: (a) => `abs(${a})`,
  exp: (a) => `exp(${a})`,
  ln: (a) => `ln(${a})`,
  log: (a) => `log10(${a})`,       // our `log` is base 10, pgfmath's is not
  log10: (a) => `log10(${a})`,
  log2: (a) => `(ln(${a})/ln(2))`,
  floor: (a) => `floor(${a})`,
  ceil: (a) => `ceil(${a})`,
  round: (a) => `round(${a})`,
  sign: (a) => `sign(${a})`,
};
const PGF_CONSTS = { pi: "pi", e: "e", tau: "(2*pi)" };

function toPgfExpr(expr) {
  const rpn = parseExpr(expr);
  const st = [];
  for (const tk of rpn) {
    if (tk.t === "num") { st.push(String(tk.v)); continue; }
    if (tk.t === "name") {
      if (tk.v === "x") { st.push("x"); continue; }
      if (PGF_CONSTS[tk.v]) { st.push(PGF_CONSTS[tk.v]); continue; }
      throw new Error(`unknown identifier '${tk.v}'`);
    }
    if (tk.v === "f") {
      const emit = PGF_FUNCS[tk.fn];
      if (!emit) throw new Error(`'${tk.fn}' has no pgfplots equivalent`);
      const a = st.pop();
      if (a === undefined) throw new Error("invalid expression");
      st.push(emit(a));
      continue;
    }
    if (tk.v === "u") {
      const a = st.pop();
      if (a === undefined) throw new Error("invalid expression");
      st.push(`(-(${a}))`);
      continue;
    }
    const b = st.pop(), a = st.pop();
    if (a === undefined || b === undefined) throw new Error("invalid expression");
    // Parenthesise every binary node: the RPN already encodes precedence, so this
    // is redundant but always correct, and pgfmath's precedence differs subtly.
    st.push(`(${a}${tk.v}${b})`);
  }
  if (st.length !== 1) throw new Error("invalid expression");
  return st[0];
}

// Plot-area padding, in canvas buffer pixels. Shared by the graph renderer and the
// hover readout so the dashed marker always lands on the value it reports.
const graphPadding = (cfg = {}) => ({
  padL: 48,
  padR: 16,
  padT: cfg.title ? 40 : 18,
  padB: cfg.xLabel ? 44 : 30,
});

// Coerce a [min, max] pair into a strictly increasing, finite range.
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

/* Tiny classnames join helper */
const cx = (...xs) => xs.filter(Boolean).join(" ");

// Strip non-serializable values (React elements, DOM nodes, functions, Symbols)
// from element data before JSON.stringify. Prevents "circular structure" errors
// if a React Fiber reference or DOM node ever leaks into element state.
const sanitize = (obj) => {
  if (obj === null || typeof obj !== "object") return obj;
  if (typeof obj === "function") return undefined;
  if (Array.isArray(obj)) return obj.map(sanitize).filter((v) => v !== undefined);
  // reject React elements / Fiber nodes / DOM nodes
  if (obj.$$typeof || obj.nodeType || obj._owner || obj.ref !== undefined) return undefined;
  const out = {};
  for (const k in obj) {
    if (k.startsWith("__react") || k.startsWith("_react")) continue;
    const v = sanitize(obj[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
};

// Bulletproof JSON serializer: uses a replacer as a second line of defense
// to skip any non-plain values that slip past sanitize() (e.g. live DOM nodes
// attached by React). Prevents "Converting circular structure to JSON" errors.
const safeStringify = (value) => JSON.stringify(value, (key, val) => {
  if (val === null || val === undefined) return val;
  if (typeof val === "function") return undefined;
  if (typeof val === "object") {
    if (typeof val.$$typeof === "symbol") return undefined;       // React element
    if (val.nodeType !== undefined && val.nodeType !== null) return undefined; // DOM node
    if (key.startsWith("__react") || key.startsWith("_react")) return undefined;
    if (val._owner !== undefined || val.ref !== undefined) return undefined;
  }
  return val;
});

// Client-side size caps. Everything runs in the browser now — code generation is
// deterministic and previews compile via TikZJax — so these exist purely to fail
// fast with a readable message instead of wedging the tab on a huge input.
const MAX_TIKZ_CHARS = 200_000;
const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024; // .tikz.json import

const PROJECT_STORAGE_KEY = "tikz-autosave";
const LAST_CODE_STORAGE_KEY = "tikz-last-code";
const PROJECT_DATA_VERSION = 5;
const DEFAULT_PROJECT_NAME = "Untitled Diagram";

const PROJECT_ELEMENT_TYPES = new Set([
  ...SHAPES.map((shape) => shape.kind),
  "pen",
  "sine",
]);
const PROJECT_BOX_TYPES = new Set([
  "rect",
  "rounded-rect",
  "parallelogram",
  "rhombus",
  "pentagon",
  "hexagon",
  "star",
  "process",
  "decision",
  "terminator",
  "document",
  "and-gate",
  "or-gate",
  "not-gate",
  "nand-gate",
  "nor-gate",
  "xor-gate",
]);
const PROJECT_CIRCLE_TYPES = new Set([
  "circle",
  "connector",
  "voltmeter",
  "ammeter",
]);
const PROJECT_LINE_TYPES = new Set([
  "line",
  "arrow",
  "resistor",
  "capacitor",
  "inductor",
  "battery",
  "diode",
]);

const isPlainRecord = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const toFiniteNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const next = Number(value);
    if (Number.isFinite(next)) return next;
  }
  return null;
};

const normalizeFiniteNumber = (value, fallback) => {
  const next = toFiniteNumber(value);
  return next === null ? fallback : next;
};

const normalizeBoolean = (value, fallback) => (typeof value === "boolean" ? value : fallback);

const normalizePoint = (value) => {
  if (!isPlainRecord(value)) return null;
  const x = toFiniteNumber(value.x);
  const y = toFiniteNumber(value.y);
  if (x === null || y === null) return null;
  const rawPressure = toFiniteNumber(value.pressure);
  return {
    x,
    y,
    ...(rawPressure === null ? {} : { pressure: Math.max(0.05, Math.min(1, rawPressure)) }),
  };
};

function normalizeLoadedElement(value, index) {
  const clean = sanitize(value);
  if (!isPlainRecord(clean) || typeof clean.type !== "string") return null;

  const type = clean.type.trim();
  if (!PROJECT_ELEMENT_TYPES.has(type)) return null;

  const element = { ...clean, type };
  if (typeof element.id !== "string" || !element.id.trim()) {
    element.id = `loaded_${index}`;
  }

  for (const key of ["x", "y", "x1", "y1", "x2", "y2", "width", "height", "radius", "rx", "ry", "lineWidth", "rotation", "fillOpacity", "fontSize", "cornerRadius"]) {
    if (element[key] !== undefined) {
      const next = toFiniteNumber(element[key]);
      if (next === null) {
        delete element[key];
      } else {
        // Sizes must be non-negative for the TikZ generator to emit valid code.
        element[key] = ["width", "height", "radius", "rx", "ry", "cornerRadius"].includes(key)
          ? Math.abs(next)
          : next;
      }
    }
  }

  if (Array.isArray(element.points)) {
    element.points = element.points.map(normalizePoint).filter(Boolean);
  }

  if (PROJECT_LINE_TYPES.has(type)) {
    if (![element.x1, element.y1, element.x2, element.y2].every((n) => typeof n === "number")) return null;
  } else if (PROJECT_CIRCLE_TYPES.has(type)) {
    if (typeof element.x !== "number" || typeof element.y !== "number") return null;
    if (type !== "connector" && typeof element.radius !== "number") return null;
  } else if (type === "ellipse") {
    if (typeof element.x !== "number" || typeof element.y !== "number") return null;
    if (typeof element.rx !== "number" || typeof element.ry !== "number") return null;
  } else if (type === "text" || type === "ground") {
    if (typeof element.x !== "number" || typeof element.y !== "number") return null;
  } else if (type === "pen") {
    if (!Array.isArray(element.points) || element.points.length < 2) return null;
  } else if (PROJECT_BOX_TYPES.has(type)) {
    if (typeof element.x !== "number" || typeof element.y !== "number") return null;
    if (typeof element.width !== "number" || typeof element.height !== "number") return null;
  }

  return element;
}

function normalizeViewport(value) {
  const viewport = isPlainRecord(value) ? value : {};
  const pan = isPlainRecord(viewport.pan) ? viewport.pan : {};
  return {
    zoom: normalizeFiniteNumber(viewport.zoom, 1),
    pan: {
      x: normalizeFiniteNumber(pan.x, 0),
      y: normalizeFiniteNumber(pan.y, 0),
    },
    showGrid: normalizeBoolean(viewport.showGrid, true),
  };
}

function normalizeProjectData(value) {
  if (!isPlainRecord(value)) return null;
  const rawElements = Array.isArray(value.elements) ? value.elements : [];
  const elements = rawElements.map(normalizeLoadedElement).filter(Boolean);
  if (rawElements.length > 0 && elements.length === 0) return null;
  const viewport = normalizeViewport(value.viewport || value);
  const settings = isPlainRecord(value.settings) ? value.settings : {};

  // Graph-mode state (functions, axes, chart options) — optional section.
  const graph = isPlainRecord(value.graph) ? value.graph : {};
  const graphFunctions = Array.isArray(graph.functions)
    ? graph.functions
        .map((f) => {
          if (!isPlainRecord(f)) return null;
          const expr = typeof f.expr === "string" ? f.expr.trim() : "";
          if (!expr) return null;
          const id =
            typeof f.id === "string" && f.id.trim()
              ? f.id.trim()
              : `f${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          return {
            id,
            expr,
            color:
              typeof f.color === "string" && f.color.trim()
                ? f.color.trim()
                : "#2563eb",
            visible: normalizeBoolean(f.visible, true),
          };
        })
        .filter(Boolean)
    : [];
  const normalizeRange = (range, fallback) => {
    if (!Array.isArray(range) || range.length < 2) return fallback;
    const lo = toFiniteNumber(range[0]);
    const hi = toFiniteNumber(range[1]);
    return lo !== null && hi !== null && lo < hi ? [lo, hi] : fallback;
  };
  const graphConfigDefaults = {
    title: "",
    xLabel: "x",
    yLabel: "y",
    showMajorTicks: true,
    showMinorTicks: true,
    showLegend: true,
    legendPosition: "north east",
    showDataLabels: false,
    gridStyle: "both",
  };
  const rawGraphConfig = isPlainRecord(graph.graphConfig) ? graph.graphConfig : {};
  const graphConfig = { ...graphConfigDefaults };
  for (const key of ["title", "xLabel", "yLabel", "legendPosition"]) {
    if (typeof rawGraphConfig[key] === "string") graphConfig[key] = rawGraphConfig[key];
  }
  for (const key of ["showMajorTicks", "showMinorTicks", "showLegend", "showDataLabels"]) {
    if (rawGraphConfig[key] !== undefined) {
      graphConfig[key] = normalizeBoolean(rawGraphConfig[key], graphConfigDefaults[key]);
    }
  }
  if (["none", "major", "both"].includes(rawGraphConfig.gridStyle)) {
    graphConfig.gridStyle = rawGraphConfig.gridStyle;
  }

  return {
    version: normalizeFiniteNumber(value.version, 1),
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : DEFAULT_PROJECT_NAME,
    elements,
    viewport,
    settings: {
      gridSize: normalizeFiniteNumber(settings.gridSize, 20),
      snapToGrid: normalizeBoolean(settings.snapToGrid, false),
    },
    graph: {
      functions: graphFunctions,
      xRange: normalizeRange(graph.xRange, [-10, 10]),
      yRange: normalizeRange(graph.yRange, [-6, 6]),
      graphConfig,
    },
  };
}

function parseProjectJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return normalizeProjectData(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

function buildProjectSnapshot({ name, elements, zoom, pan, showGrid, snapToGrid, mode, functions, xRange, yRange, graphConfig }) {
  return {
    version: PROJECT_DATA_VERSION,
    name: name || DEFAULT_PROJECT_NAME,
    created: Date.now(),
    modified: Date.now(),
    elements: sanitize(elements),
    viewport: {
      zoom,
      pan,
      showGrid,
    },
    settings: {
      gridSize: 20,
      snapToGrid,
    },
    graph: {
      functions: sanitize(functions || []),
      xRange: Array.isArray(xRange) && xRange.length === 2 ? xRange : [-10, 10],
      yRange: Array.isArray(yRange) && yRange.length === 2 ? yRange : [-6, 6],
      graphConfig: graphConfig || {},
    },
  };
}

/* =========================================================================
 * DETERMINISTIC TIKZ CODE GENERATOR (no AI — pure coordinate mapping)
 * Converts element objects directly into compile-ready TikZ code.
 * ========================================================================= */

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

function generateTikzLocal(state) {
  const { mode, elements, functions, xRange, yRange, graphConfig, projectName, canvasHeight } = state;
  const H = mode === "graph" ? (canvasHeight || 800) : tikzFlipOrigin(elements, canvasHeight);
  const lines = [];
  lines.push(`% Auto-generated by TikZ Studio — ${projectName || "Untitled"}`);

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
        lines.push(`  % skipped ${texEscape(f.expr)} — ${texEscape(err.message)}`);
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

/* =========================================================================
 * MAIN APP COMPONENT
 * ========================================================================= */
export default function TikzApp() {
  /* ---------- App mode (Diagram vs Graphing) ---------- */
  const [mode, setMode] = useState("diagram"); // "diagram" | "graph"

  /* ---------- Left shape library ---------- */
  const [activeCategory, setActiveCategory] = useState("Basic");
  const [shapeSearch, setShapeSearch] = useState("");
  const [shapePopoverOpen, setShapePopoverOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  /* ---------- Tool / placement ---------- */
  const [tool, setTool] = useState("select"); // select | eraser | pen | PLACEHOLDER_TOOL
  const [pendingShape, setPendingShape] = useState(null); // kind waiting to be placed

  /* ---------- Style defaults for new elements ---------- */
  const [strokeColor, setStrokeColor] = useState("#1f2937");
  const [lineWidth, setLineWidth] = useState(2);
  const [isDashed, setIsDashed] = useState(false);
  const [hasArrow, setHasArrow] = useState(false);
  const [fillColor, setFillColor] = useState("transparent");
  const [textLabel, setTextLabel] = useState("Label");
  const [textFontSize, setTextFontSize] = useState(20);
  const [textFontFamily, setTextFontFamily] = useState("sans-serif");
  const [textIsLatex, setTextIsLatex] = useState(false);

  /* ---------- Elements / history (diagram mode) ---------- */
  const [elements, setElements] = useState([]);
  const elementIdCounter = useRef(0);
  const [historyStack, setHistoryStack] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  /* ---------- Selection ---------- */
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [renderTick, setRenderTick] = useState(0); // bump to force a canvas redraw
  const [canvasH, setCanvasH] = useState(800); // tracked canvas height for code gen

  /* ---------- Dragging / drawing ---------- */
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragElementStart, setDragElementStart] = useState(null);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw','ne','sw','se','n','s','e','w'
  const resizeStartRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentShape, setCurrentShape] = useState(null);
  const tempPointsRef = useRef([]);

  /* ---------- Canvas / viewport ---------- */
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const graphCanvasRef = useRef(null);
  const graphContainerRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const gridSize = 20;

  /* ---------- Project ---------- */
  const [projectName, setProjectName] = useState(DEFAULT_PROJECT_NAME);

  /* ---------- AI pipeline (Code + Preview dock) ---------- */
  const [tikzCode, setTikzCode] = useState("");
  // "canvas" = mirrors the deterministic generator; "external" = imported from an
  // image or recovered from storage, and must not be overwritten by regeneration.
  const [codeSource, setCodeSource] = useState("canvas");
  const [error, setError] = useState(null);
  const [renderingPreview, setRenderingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewStatus, setPreviewStatus] = useState("");
  const [outputOpen, setOutputOpen] = useState(false); // bottom dock visibility
  const [outputTab, setOutputTab] = useState("code"); // "code" | "preview"
  const [previewZoom, setPreviewZoom] = useState(1); // 0.1–4, or "fit"
  const previewWrapRef = useRef(null);
  const [outputHeight, setOutputHeight] = useState(280);
  const resizingOutputRef = useRef(false);

  /* ---------- Resizable side panels ---------- */
  // (There is no left sidebar in this shell — the shape library is a popover.)
  const [rightWidth, setRightWidth] = useState(280);
  const resizingRightRef = useRef(false);

  /* ---------- Graphing mode (Desmos-style) ---------- */
  const [functions, setFunctions] = useState([
    { id: "f1", expr: "sin(x)", color: "#2563eb", visible: true },
    { id: "f2", expr: "0.3*x^2 - 2", color: "#ef4444", visible: true },
  ]);
  const [fnIdCounter, setFnIdCounter] = useState(3);
  const [xRange, setXRange] = useState([-10, 10]);
  const [yRange, setYRange] = useState([-6, 6]);
  const [graphHoverX, setGraphHoverX] = useState(null);
  const [graphConfig, setGraphConfig] = useState({
    title: "",
    xLabel: "x",
    yLabel: "y",
    showMajorTicks: true,
    showMinorTicks: true,
    showLegend: true,
    legendPosition: "north east",
    showDataLabels: false,
    gridStyle: "both", // none | major | both
  });

  const selectedElement = selectedId ? elements.find((e) => e.id === selectedId) : null;
  const visibleFunctions = useMemo(
    () => functions.filter((f) => f.visible && f.expr.trim()),
    [functions]
  );
  const hasCodeSource = mode === "diagram" ? elements.length > 0 : visibleFunctions.length > 0;

  /* ---------- ID generation & history ---------- */
  const generateId = () => `elem_${elementIdCounter.current++}`;

  const saveToHistory = useCallback((newElements) => {
    const newHistory = historyStack.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    if (newHistory.length > 30) newHistory.shift();
    else setHistoryIndex(historyIndex + 1);
    setHistoryStack(newHistory);
  }, [historyIndex, historyStack]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements(historyStack[newIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, historyStack]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements(historyStack[newIndex]);
      setSelectedId(null);
    }
  }, [historyIndex, historyStack]);

  const restoreViewport = useCallback((project) => {
    setProjectName(project.name || DEFAULT_PROJECT_NAME);
    setElements(project.elements || []);
    setHistoryStack([project.elements || []]);
    setHistoryIndex(0);
    setZoom(project.viewport?.zoom ?? 1);
    setPan(project.viewport?.pan ?? { x: 0, y: 0 });
    setShowGrid(project.viewport?.showGrid ?? true);
    setSnapToGrid(project.settings?.snapToGrid ?? false);
    // Graph-mode state (functions, axes, chart options).
    if (project.graph) {
      const g = project.graph;
      if (Array.isArray(g.functions) && g.functions.length) {
        setFunctions(g.functions);
        let maxFn = 2;
        for (const f of g.functions) {
          const n = parseInt(String(f.id || "").replace(/\D/g, ""), 10);
          if (Number.isFinite(n)) maxFn = Math.max(maxFn, n);
        }
        setFnIdCounter(maxFn + 1);
      }
      if (Array.isArray(g.xRange) && g.xRange.length === 2) setXRange(g.xRange);
      if (Array.isArray(g.yRange) && g.yRange.length === 2) setYRange(g.yRange);
      if (isPlainRecord(g.graphConfig)) {
        setGraphConfig((prev) => ({ ...prev, ...g.graphConfig }));
      }
    }
    setSelectedId(null);
  }, [setFunctions, setFnIdCounter, setXRange, setYRange, setGraphConfig]);

  const resyncTimerRef = useRef(null);
  const resyncCanvasSize = useCallback(() => {
    clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      const wrap = containerRef.current;
      if (canvas && wrap) {
        canvas.width = wrap.clientWidth;
        canvas.height = wrap.clientHeight;
        setCanvasH(wrap.clientHeight);
      }
      setRenderTick((n) => n + 1);
    }, 120);
  }, []);
  useEffect(() => () => clearTimeout(resyncTimerRef.current), []);

  /* ---------- Load saved state ---------- */
  useEffect(() => {
    const saved = readStorage(LAST_CODE_STORAGE_KEY);
    const savedProject = parseProjectJson(readStorage(PROJECT_STORAGE_KEY));
    const timer = setTimeout(() => {
      if (saved) { setCodeSource("external"); setTikzCode(saved); }
      if (savedProject?.elements?.length) {
        const label = savedProject.name || DEFAULT_PROJECT_NAME;
        if (confirm(`Recover autosaved project "${label}"?`)) {
          restoreViewport(savedProject);
          resyncCanvasSize();
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [restoreViewport, resyncCanvasSize]);

  useEffect(() => {
    if (tikzCode) writeStorage(LAST_CODE_STORAGE_KEY, tikzCode);
    else removeStorage(LAST_CODE_STORAGE_KEY);
  }, [tikzCode]);

  // Autosave. The snapshot inputs live in a ref rather than the dependency array:
  // with `elements` as a dependency the interval was torn down and restarted on every
  // edit, so continuous work meant the 30s timer never actually elapsed.
  const autosaveRef = useRef(null);
  useEffect(() => {
    autosaveRef.current = { name: projectName, elements, zoom, pan, showGrid, snapToGrid, mode, functions, xRange, yRange, graphConfig };
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const snapshot = safeStringify(buildProjectSnapshot(autosaveRef.current));
      if (snapshot) writeStorage(PROJECT_STORAGE_KEY, snapshot);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Derived undo/redo flags (no effect needed)
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < historyStack.length - 1;

  // (canvas render-trigger effects declared after renderDiagram, below)

  // Resize diagram canvas to fill its container — keep buffer synced with CSS size
  useEffect(() => {
    if (mode !== "diagram") return;
    const resize = () => {
      const c = canvasRef.current, wrap = containerRef.current;
      if (!c || !wrap) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        setCanvasH(h); // track for code generation
        setRenderTick((n) => n + 1); // force redraw after resize
      }
    };
    // initial
    resize();
    const t = setTimeout(resize, 60);
    // observe container size changes (panel toggle, dock open/close, etc.)
    let ro;
    if (containerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", resize);
    return () => { clearTimeout(t); window.removeEventListener("resize", resize); ro?.disconnect(); };
  }, [mode]);

  // (graph-canvas resize effect moved below renderGraph declaration)

  // Panel resizing drag handlers
  useEffect(() => {
    const onMove = (e) => {
      if (resizingRightRef.current) {
        const w = Math.min(460, Math.max(220, window.innerWidth - e.clientX));
        setRightWidth(w);
      } else if (resizingOutputRef.current) {
        const h = Math.min(window.innerHeight - 200, Math.max(140, window.innerHeight - e.clientY));
        setOutputHeight(h);
      }
    };
    const onUp = () => {
      resizingRightRef.current = false;
      resizingOutputRef.current = false;
      document.body.style.cursor = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  /* ---------- Element CRUD ---------- */
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    const next = elements.filter((el) => el.id !== selectedId);
    setElements(next);
    saveToHistory(next);
    setSelectedId(null);
  }, [elements, saveToHistory, selectedId]);

  const duplicateSelected = () => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    // Only offset the coordinate fields this element actually has. Adding x/y to a
    // line or pen stroke would create phantom fields that the drag handler then
    // moves and that get serialised into saved projects.
    const clone = { ...el, id: generateId(), created: Date.now(), modified: Date.now() };
    for (const k of ["x", "y", "x1", "y1", "x2", "y2"]) {
      if (typeof el[k] === "number") clone[k] = el[k] + 20;
    }
    if (el.points) clone.points = el.points.map((p) => ({ x: p.x + 20, y: p.y + 20 }));
    const next = [...elements, clone];
    setElements(next); saveToHistory(next); setSelectedId(clone.id);
  };

  const updateElementProperty = (id, key, value) => {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, [key]: value, modified: Date.now() } : el)));
  };
  const commitHistory = () => saveToHistory(elements);

  const clearAll = useCallback(() => {
    if (elements.length && confirm("Clear all elements?")) {
      setElements([]);
      saveToHistory([]);
      setSelectedId(null);
    }
  }, [elements, saveToHistory]);

  // Keyboard shortcuts (declared after handlers it references)
  useEffect(() => {
    const onKey = (e) => {
      // `e.key` is undefined for some IME/composition events, and typing into a
      // contentEditable must not trigger the Delete shortcut.
      if (e.isComposing || typeof e.key !== "string") return;
      const key = e.key.toLowerCase();
      const tag = e.target.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && key === "z" && !e.shiftKey) {
        e.preventDefault(); handleUndo();
      } else if (((e.ctrlKey || e.metaKey) && key === "y") ||
                 ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "z")) {
        e.preventDefault(); handleRedo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !inField) {
        e.preventDefault(); deleteSelected();
      } else if (e.key === "Escape") {
        setSelectedId(null); setPendingShape(null); setTool("select"); setShapePopoverOpen(false);
      } else if (!inField && mode === "diagram") {
        if (key === "v") { setTool("select"); setPendingShape(null); }
        else if (key === "p") { setTool("pen"); setPendingShape(null); }
        else if (key === "e") { setTool("eraser"); setPendingShape(null); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, handleRedo, handleUndo, mode]);

  /* ---------- Viewport ---------- */
  const ZOOM_MIN = 0.15, ZOOM_MAX = 5;

  // Zoom about a fixed point (in canvas-element CSS pixels), adjusting pan so that
  // point stays put. Without this, zooming pushes the drawing off-screen.
  const zoomAbout = useCallback((factor, anchor) => {
    const c = canvasRef.current;
    const px = anchor?.x ?? (c ? c.width / 2 : 0);
    const py = anchor?.y ?? (c ? c.height / 2 : 0);
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    if (next === zoom) return;
    const ratio = next / zoom;
    setPan((p) => ({ x: px - (px - p.x) * ratio, y: py - (py - p.y) * ratio }));
    setZoom(next);
  }, [zoom]);

  const zoomIn = () => zoomAbout(1.2);
  const zoomOut = () => zoomAbout(1 / 1.2);
  const zoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  // Trackpad / wheel: ctrl or meta zooms about the cursor, otherwise scroll pans.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || mode !== "diagram") return;
    // Registered manually because React's onWheel is passive and cannot preventDefault.
    const onWheel = (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = c.getBoundingClientRect();
        zoomAbout(Math.exp(-e.deltaY * 0.002), { x: e.clientX - r.left, y: e.clientY - r.top });
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [mode, zoomAbout]);

  // Space-drag panning (middle-mouse is handled in onPointerDown).
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef(null);
  useEffect(() => {
    if (mode !== "diagram") return;
    const down = (e) => {
      if (e.code !== "Space") return;
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      e.preventDefault();
      setSpaceHeld(true);
    };
    const up = (e) => { if (e.code === "Space") setSpaceHeld(false); };
    const blur = () => setSpaceHeld(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [mode]);

  const snap = (v) => (snapToGrid ? Math.round(v / gridSize) * gridSize : v);
  // Snap a whole geometry delta/point. Applied only where a value is committed to an
  // element — never inside screenToCanvas, which must stay exact so that hit-testing
  // and handle detection are not quantised to the grid.
  const snapPt = (p) => ({ x: snap(p.x), y: snap(p.y) });
  const screenToCanvas = (sx, sy) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: (sx - r.left - pan.x) / zoom, y: (sy - r.top - pan.y) / zoom };
  };
  const getCoords = (e) => {
    const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const rawPressure = Number.isFinite(e.pressure) ? e.pressure : 0.5;
    return {
      ...screenToCanvas(cx, cy),
      pressure: e.pointerType === "pen" ? Math.max(0.05, Math.min(1, rawPressure)) : null,
    };
  };

  const elementAt = (x, y) => {
    // Tolerance is in canvas units, so scale it by zoom to keep the grab area a
    // constant number of screen pixels at any magnification.
    const tol = 6 / zoom;
    for (let i = elements.length - 1; i >= 0; i--) {
      if (isPointInElement(x, y, elements[i], tol)) return elements[i].id;
    }
    return null;
  };

  // Detect if a point hits a resize handle on the selected element.
  // Returns handle id ('nw','ne','sw','se','n','s','e','w','rotate','start','end') or null.
  const handleAt = (x, y, el) => {
    if (!el) return null;
    const hs = 8 / zoom; // handle size in canvas units

    // Line/arrow/circuit elements: endpoint handles at (x1,y1) and (x2,y2)
    if ((el.type === "line" || el.type === "arrow" || LINE_KINDS.has(el.type)) && el.x1 !== undefined) {
      // Inverse-rotate for rotated lines (rare but possible)
      let tx = x, ty = y;
      if (el.rotation) {
        const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2;
        const rad = -(el.rotation * Math.PI) / 180;
        const co = Math.cos(rad), si = Math.sin(rad);
        tx = cx + (x - cx) * co - (y - cy) * si;
        ty = cy + (x - cx) * si + (y - cy) * co;
      }
      if (Math.hypot(tx - el.x1, ty - el.y1) <= hs) return "start";
      if (Math.hypot(tx - el.x2, ty - el.y2) <= hs) return "end";
      return null;
    }

    const b = getElementBounds(el, 0);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    // Inverse-rotate the test point into the element's local frame.
    let lx = x, ly = y;
    if (el.rotation) {
      const rad = -(el.rotation * Math.PI) / 180;
      const co = Math.cos(rad), si = Math.sin(rad);
      lx = cx + (x - cx) * co - (y - cy) * si;
      ly = cy + (x - cx) * si + (y - cy) * co;
    }
    // rotation handle (above top-center, in local frame)
    const rotY = b.y - 22 / zoom;
    const midX = b.x + b.width / 2;
    if (Math.hypot(lx - midX, ly - rotY) <= hs) return "rotate";
    const corners = {
      nw: [b.x, b.y], ne: [b.x + b.width, b.y],
      se: [b.x + b.width, b.y + b.height], sw: [b.x, b.y + b.height],
    };
    // Handles are drawn `hs` wide centred on the point, so the hit half-extent is
    // hs/2 plus a couple of screen pixels of slop.
    const grab = hs / 2 + 2 / zoom;
    const near = (a, bv) => Math.abs(a - bv) <= grab;
    for (const [id, [hx, hy]] of Object.entries(corners)) {
      if (near(lx, hx) && near(ly, hy)) return id;
    }
    if (near(lx, midX) && near(ly, b.y)) return "n";
    if (near(lx, midX) && near(ly, b.y + b.height)) return "s";
    if (near(lx, b.x) && near(ly, b.y + b.height / 2)) return "w";
    if (near(lx, b.x + b.width) && near(ly, b.y + b.height / 2)) return "e";
    return null;
  };

  // Whether an element type supports box resizing (has width/height or points).
  const isResizable = (el) =>
    el && (BOX_KINDS.has(el.type) || el.type === "ellipse" || el.type === "circle" || CIRC_KINDS.has(el.type) || el.type === "pen" || el.type === "line" || el.type === "arrow" || LINE_KINDS.has(el.type));

  /* ---------- Click-to-place from the shape library ---------- */
  const requestPlace = (kind) => {
    setTool(PLACEHOLDER_TOOL);
    setPendingShape(kind);
    setSelectedId(null);
  };

  const placeShapeAt = (rawX, rawY) => {
    const { x, y } = snapPt({ x: rawX, y: rawY });
    const kind = pendingShape;
    const g = DEFAULT_GEOMETRY[kind] || {};
    const base = {
      id: generateId(),
      type: kind,
      strokeColor, lineWidth, fillColor, isDashed,
      created: Date.now(), modified: Date.now(),
    };
    let el;
    if (LINE_KINDS.has(kind) || kind === "line" || kind === "arrow") {
      el = { ...base, x1: x, y1: y, x2: x + (g.dx || 100), y2: y + (g.dy || 0), hasArrow: kind === "arrow" };
    } else if (CIRC_KINDS.has(kind) || kind === "circle") {
      el = { ...base, x, y, radius: g.radius || 40 };
    } else if (kind === "ellipse") {
      el = { ...base, x, y, rx: g.rx || 60, ry: g.ry || 40 };
    } else if (kind === "text") {
      el = { ...base, x, y, text: textLabel, fontSize: textFontSize, fontFamily: textFontFamily, isLatex: textIsLatex };
    } else if (kind === "ground") {
      el = { ...base, x, y };
    } else {
      // box-like (rect, rounded-rect, triangle, rhombus, pentagon, hexagon, star, decision, process, terminator, document, gates, parallelogram)
      el = { ...base, x, y, width: g.width || 100, height: g.height || 70, ...(g.cornerRadius ? { cornerRadius: g.cornerRadius } : {}) };
    }
    const next = [...elements, el];
    setElements(next); saveToHistory(next);
    setSelectedId(el.id);
    // keep the same shape armed for rapid placement? No — return to select after place
    setPendingShape(null); setTool("select");
  };

  /* ---------- Pointer handlers (diagram canvas) ---------- */
  // Eraser supports click *and* drag, so a stroke across several shapes removes them all.
  const erasingRef = useRef(false);
  const activePenPointerRef = useRef(null);
  const pointerDownRef = useRef(null);
  const isPalmPointer = (e) => e.pointerType === "touch" && activePenPointerRef.current !== null;
  const eraseAt = (x, y) => {
    const id = elementAt(x, y);
    if (!id) return;
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (id === selectedId) setSelectedId(null);
    setHoveredId(null);
  };

  const onPointerDown = (e) => {
    if (e.pointerType === "pen") activePenPointerRef.current = e.pointerId;
    else if (isPalmPointer(e)) { e.preventDefault(); return; }
    // Capture pointer so move/up events keep firing even outside the canvas
    // (essential for drag-to-rotate and drag-to-resize at edges).
    //
    // Capturing is deferred for pen/touch: on iPadOS, setPointerCapture on a
    // stationary tap can leave the capture stuck on the canvas after the tap
    // ends, which then swallows every later tap on the toolbar (WebKit
    // pointer-capture bug). Mouse pointers capture immediately.
    pointerDownRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, captured: false };
    if (e.pointerType === "mouse") {
      try { e.currentTarget.setPointerCapture(e.pointerId); pointerDownRef.current.captured = true; } catch {}
    }
    const { x, y, pressure } = getCoords(e);

    // Middle-mouse or space-drag pans the viewport, whatever tool is active.
    if (e.button === 1 || spaceHeld) {
      e.preventDefault();
      panStartRef.current = { px: e.clientX, py: e.clientY, pan: { ...pan } };
      return;
    }

    if (tool === "eraser") {
      erasingRef.current = true;
      eraseAt(x, y);
      return;
    }

    if (tool === PLACEHOLDER_TOOL && pendingShape) {
      placeShapeAt(x, y);
      return;
    }

    if (tool === "select") {
      // 1. Check resize handle hit on currently selected element
      if (selectedId) {
        const sel = elements.find((e) => e.id === selectedId);
          if (isResizable(sel)) {
            const h = handleAt(x, y, sel);
            if (h) {
              setResizeHandle(h);
              setDragStartPos({ x, y });
              // For pen strokes, capture bounding box + original points
              let penBounds = null, penPoints = null;
              if (sel.type === "pen" && sel.points?.length) {
                const xs = sel.points.map((p) => p.x), ys = sel.points.map((p) => p.y);
                penBounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs) || 1, height: Math.max(...ys) - Math.min(...ys) || 1 };
                penPoints = sel.points.map((p) => ({ ...p }));
              }
              resizeStartRef.current = {
                x: sel.x, y: sel.y, width: sel.width, height: sel.height,
                rx: sel.rx, ry: sel.ry, radius: sel.radius, x1: sel.x1, y1: sel.y1, x2: sel.x2, y2: sel.y2,
                rotation: sel.rotation || 0,
                penBounds, penPoints,
              };
              return;
            }
          }
      }
      // 2. Otherwise, select / start move drag
      const id = elementAt(x, y);
      if (id) {
        setSelectedId(id);
        setIsDragging(true);
        setDragStartPos({ x, y });
        const el = elements.find((e) => e.id === id);
        if (el) {
          setDragElementStart({
            x: el.x, y: el.y, x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2,
            points: el.points ? el.points.map((p) => ({ ...p })) : null,
          });
        }
      } else setSelectedId(null);
      return;
    }

    if (tool === "text") {
      const el = {
        id: generateId(), type: "text", x, y, text: textLabel,
        fontSize: textFontSize, fontFamily: textFontFamily, isLatex: textIsLatex,
        strokeColor, created: Date.now(), modified: Date.now(),
      };
      const next = [...elements, el];
      setElements(next); saveToHistory(next); setSelectedId(el.id);
      return;
    }

    if (tool === "ground") {
      const el = {
        id: generateId(), type: "ground", x, y, strokeColor, lineWidth,
        created: Date.now(), modified: Date.now(),
      };
      const next = [...elements, el];
      setElements(next); saveToHistory(next); setSelectedId(el.id);
      return;
    }

    // pen / shape drag draw
    setIsDrawing(true);
    setStartPos({ x, y });
    tempPointsRef.current = [];
    if (tool === "pen") {
      const point = { x, y, ...(pressure === null ? {} : { pressure }) };
      tempPointsRef.current = [point];
      setCurrentShape({ type: "pen", points: [point], strokeColor, lineWidth, isDashed });
    }
  };

  const onPointerMove = (e) => {
    if (isPalmPointer(e)) return;
    // Promote the deferred capture to a real one once the pointer has actually
    // moved past a tiny threshold (a real drag, not a tap). See onPointerDown.
    const p = pointerDownRef.current;
    if (p && !p.captured && p.id === e.pointerId &&
        Math.hypot(e.clientX - p.x, e.clientY - p.y) > 3) {
      try { e.currentTarget.setPointerCapture(e.pointerId); p.captured = true; } catch {}
    }
    // Viewport panning takes priority over any tool.
    if (panStartRef.current) {
      const s = panStartRef.current;
      setPan({ x: s.pan.x + (e.clientX - s.px), y: s.pan.y + (e.clientY - s.py) });
      return;
    }

    const { x, y, pressure } = getCoords(e);

    if (tool === "eraser") {
      if (erasingRef.current) eraseAt(x, y);
      else setHoveredId(elementAt(x, y));
      return;
    }

    // Resize / rotate dragging
    if (tool === "select" && resizeHandle && resizeStartRef.current) {
      const s = resizeStartRef.current;
      const h = resizeHandle;

      if (h === "rotate") {
        const el = elements.find((e) => e.id === selectedId);
        if (el) {
          const b = getElementBounds(el, 0);
          const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
          let angle = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
          if (e.shiftKey) angle = Math.round(angle / 15) * 15; // snap to 15° with Shift
          updateElementProperty(selectedId, "rotation", Math.round(angle));
        }
        return;
      }

      // Line/arrow endpoint dragging — move individual endpoints freely
      if ((h === "start" || h === "end") && s.x1 !== undefined) {
        const p = snapPt({ x, y });
        setElements((prev) => prev.map((el) => {
          if (el.id !== selectedId) return el;
          const u = { ...el, modified: Date.now() };
          if (h === "start") { u.x1 = p.x; u.y1 = p.y; }
          else { u.x2 = p.x; u.y2 = p.y; }
          return u;
        }));
        return;
      }

      // Snap the resize delta rather than the raw cursor, so a snapped edge lands on
      // the grid without the cursor position itself being quantised.
      const dx = snap(x - dragStartPos.x), dy = snap(y - dragStartPos.y);
      const shift = e.shiftKey;
      // Convert screen-space delta to element local-space delta (accounting for rotation).
      // Must match the inverse-rotation formula used in isPointInElement / handleAt.
      const rotMat = (s.rotation || 0) * Math.PI / 180;
      const ldx_all = dx * Math.cos(-rotMat) - dy * Math.sin(-rotMat);
      const ldy_all = dx * Math.sin(-rotMat) + dy * Math.cos(-rotMat);

      // Helper: rotate a point around a center
      const rotatePt = (px, py, cx, cy, ang) => {
        const co = Math.cos(ang), si = Math.sin(ang);
        return { x: cx + (px - cx) * co - (py - cy) * si, y: cy + (px - cx) * si + (py - cy) * co };
      };

      setElements((prev) => prev.map((el) => {
        if (el.id !== selectedId) return el;
        const u = { ...el, modified: Date.now() };
        if (CIRC_KINDS.has(el.type) || el.type === "circle") {
          // radius resize — use distance from center
          const cx = s.x, cy = s.y;
          const nr = Math.max(4, snap(Math.hypot(x - cx, y - cy)));
          u.radius = nr;
          return u;
        }
        if (el.type === "pen" && s.penBounds && s.penPoints) {
          const b = s.penBounds;
          // Keep the opposite edge/corner fixed in SCREEN space.
          // For the original bounds, compute the anchor (opposite side) screen position.
          const oldCx = b.x + b.width / 2, oldCy = b.y + b.height / 2;
          // The anchor in local space (opposite of the dragged handle)
          let ax = b.x + b.width / 2, ay = b.y + b.height / 2; // default: center
          if (h.includes("e")) ax = b.x;           // anchor west edge
          if (h.includes("w")) ax = b.x + b.width;  // anchor east edge
          if (h.includes("s")) ay = b.y;           // anchor north edge
          if (h.includes("n")) ay = b.y + b.height; // anchor south edge
          // Anchor screen position (rotate local anchor point around old center)
          const anchorScreen = rotatePt(ax, ay, oldCx, oldCy, rotMat);

          let nBw = b.width, nBh = b.height;
          if (h.includes("e")) nBw = Math.max(8, b.width + ldx_all);
          if (h.includes("w")) nBw = Math.max(8, b.width - ldx_all);
          if (h.includes("s")) nBh = Math.max(8, b.height + ldy_all);
          if (h.includes("n")) nBh = Math.max(8, b.height - ldy_all);
          // Shift: lock aspect ratio
          if (shift && b.width > 0 && b.height > 0) {
            const ratio = b.height / b.width;
            if (h === "e" || h === "w") nBh = nBw * ratio;
            else if (h === "n" || h === "s") nBw = nBh / ratio;
            else {
              if (Math.abs(nBw - b.width) * ratio >= Math.abs(nBh - b.height)) nBh = nBw * ratio;
              else nBw = nBh / ratio;
            }
          }
          // Compute new local position so the anchor stays at the same screen position.
          // New anchor in local space:
          let nax = nBw / 2, nay = nBh / 2;
          if (h.includes("e")) nax = 0;
          if (h.includes("w")) nax = nBw;
          if (h.includes("s")) nay = 0;
          if (h.includes("n")) nay = nBh;
          // The new center in screen space = anchorScreen rotated back by (nax,nay) in local
          const newCx = anchorScreen.x - (nax - nBw / 2) * Math.cos(rotMat) + (nay - nBh / 2) * Math.sin(rotMat);
          const newCy = anchorScreen.y - (nax - nBw / 2) * Math.sin(rotMat) - (nay - nBh / 2) * Math.cos(rotMat);
          // New local top-left
          const nBx = newCx - nBw / 2, nBy = newCy - nBh / 2;
          const scx = nBw / b.width, scy = nBh / b.height;
          u.points = s.penPoints.map((p) => ({ x: nBx + (p.x - b.x) * scx, y: nBy + (p.y - b.y) * scy }));
          return u;
        }
        if (el.type === "ellipse") {
          // The ellipse is stored as centre + radii. Grow by half the drag on the
          // dragged side and shift the centre by the other half, so the opposite
          // edge stays put — matching how box and pen resizing behave.
          let nrx = s.rx, nry = s.ry;
          if (h.includes("e")) nrx = Math.max(4, s.rx + ldx_all / 2);
          if (h.includes("w")) nrx = Math.max(4, s.rx - ldx_all / 2);
          if (h.includes("s")) nry = Math.max(4, s.ry + ldy_all / 2);
          if (h.includes("n")) nry = Math.max(4, s.ry - ldy_all / 2);
          if (shift && s.rx > 0 && s.ry > 0) {
            const ratio = s.ry / s.rx;
            if (h === "e" || h === "w") nry = nrx * ratio;
            else if (h === "n" || h === "s") nrx = nry / ratio;
            else {
              if (Math.abs(nrx - s.rx) * ratio >= Math.abs(nry - s.ry)) nry = nrx * ratio;
              else nrx = nry / ratio;
            }
          }
          // Centre shift in the element's local frame, then rotated into screen space.
          let ldcx = 0, ldcy = 0;
          if (h.includes("e")) ldcx = nrx - s.rx;
          if (h.includes("w")) ldcx = -(nrx - s.rx);
          if (h.includes("s")) ldcy = nry - s.ry;
          if (h.includes("n")) ldcy = -(nry - s.ry);
          const co = Math.cos(rotMat), si = Math.sin(rotMat);
          Object.assign(u, {
            rx: nrx,
            ry: nry,
            x: s.x + ldcx * co - ldcy * si,
            y: s.y + ldcx * si + ldcy * co,
          });
          return u;
        }
        // box-like — keep the opposite edge anchored in SCREEN space
        {
          const oldCx = s.x + s.width / 2, oldCy = s.y + s.height / 2;
          // Anchor in local space (opposite of dragged handle)
          let ax = s.x + s.width / 2, ay = s.y + s.height / 2;
          if (h.includes("e")) ax = s.x;
          if (h.includes("w")) ax = s.x + s.width;
          if (h.includes("s")) ay = s.y;
          if (h.includes("n")) ay = s.y + s.height;
          const anchorScreen = rotatePt(ax, ay, oldCx, oldCy, rotMat);

          let nw = s.width, nh = s.height;
          if (h.includes("e")) nw = Math.max(8, s.width + ldx_all);
          if (h.includes("w")) nw = Math.max(8, s.width - ldx_all);
          if (h.includes("s")) nh = Math.max(8, s.height + ldy_all);
          if (h.includes("n")) nh = Math.max(8, s.height - ldy_all);
          if (shift && s.width > 0 && s.height > 0) {
            const ratio = s.height / s.width;
            if (h === "e" || h === "w") nh = nw * ratio;
            else if (h === "n" || h === "s") nw = nh / ratio;
            else {
              if (Math.abs(nw - s.width) * ratio >= Math.abs(nh - s.height)) nh = nw * ratio;
              else nw = nh / ratio;
            }
          }
          // New anchor offset in local space
          let nax = nw / 2, nay = nh / 2;
          if (h.includes("e")) nax = 0;
          if (h.includes("w")) nax = nw;
          if (h.includes("s")) nay = 0;
          if (h.includes("n")) nay = nh;
          // Compute new center so anchor stays fixed on screen
          const dax = nax - nw / 2, day = nay - nh / 2;
          const newCx = anchorScreen.x - dax * Math.cos(rotMat) + day * Math.sin(rotMat);
          const newCy = anchorScreen.y - dax * Math.sin(rotMat) - day * Math.cos(rotMat);
          const nx = newCx - nw / 2, ny = newCy - nh / 2;
          Object.assign(u, { x: nx, y: ny, width: nw, height: nh });
          return u;
        }
      }));
      return;
    }

    if (tool === "select" && !isDrawing && !isDragging) { setHoveredId(elementAt(x, y)); return; }

    if (tool === "select" && isDragging && selectedId && dragElementStart) {
      // Snap the movement delta, not the cursor: the element keeps its relative
      // offset under the pointer while still landing on grid multiples.
      const dx = snap(x - dragStartPos.x), dy = snap(y - dragStartPos.y);
      setElements((prev) => prev.map((el) => {
        if (el.id !== selectedId) return el;
        const u = { ...el, modified: Date.now() };
        if (el.x !== undefined) { u.x = dragElementStart.x + dx; u.y = dragElementStart.y + dy; }
        if (el.x1 !== undefined) {
          u.x1 = dragElementStart.x1 + dx; u.y1 = dragElementStart.y1 + dy;
          u.x2 = dragElementStart.x2 + dx; u.y2 = dragElementStart.y2 + dy;
        }
        if (el.points && dragElementStart.points) {
          u.points = dragElementStart.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
        return u;
      }));
      return;
    }

    if (!isDrawing) return;

    if (tool === "pen") {
      tempPointsRef.current.push({ x, y, ...(pressure === null ? {} : { pressure }) });
      setCurrentShape({ type: "pen", points: [...tempPointsRef.current], strokeColor, lineWidth, isDashed });
      return;
    }

    // Snap both ends of the drag when snapping is on — the raw cursor stays exact
    // (see screenToCanvas) so only the committed geometry is quantised.
    const sp = snapPt(startPos);
    const cur = snapPt({ x, y });
    const w = cur.x - sp.x, h = cur.y - sp.y;
    // Normalize drag geometry so boxes keep positive width/height regardless
    // of the direction the user drags (avoids broken TikZ rectangle output).
    const box = {
      x: Math.min(sp.x, cur.x),
      y: Math.min(sp.y, cur.y),
      width: Math.abs(w),
      height: Math.abs(h),
    };
    let shape = null;
    const common = { strokeColor, fillColor, lineWidth, isDashed };
    switch (tool) {
      case "rect": shape = { type: "rect", ...box, ...common }; break;
      case "rounded-rect": shape = { type: "rounded-rect", ...box, cornerRadius: 12, ...common }; break;
      case "circle": shape = { type: "circle", x: sp.x, y: sp.y, radius: snap(Math.hypot(w, h)), ...common }; break;
      case "ellipse": shape = { type: "ellipse", x: sp.x, y: sp.y, rx: Math.abs(w), ry: Math.abs(h), ...common }; break;
      case "triangle": shape = { type: "triangle", ...box, ...common }; break;
      case "line": shape = { type: "line", x1: sp.x, y1: sp.y, x2: cur.x, y2: cur.y, strokeColor, lineWidth, isDashed, hasArrow }; break;
      case "arrow": shape = { type: "arrow", x1: sp.x, y1: sp.y, x2: cur.x, y2: cur.y, strokeColor, lineWidth, isDashed, hasArrow: true }; break;
      case "parallelogram": shape = { type: "parallelogram", ...box, ...common }; break;
      case "rhombus": shape = { type: "rhombus", ...box, ...common }; break;
      case "pentagon": shape = { type: "pentagon", ...box, ...common }; break;
      case "hexagon": shape = { type: "hexagon", ...box, ...common }; break;
      case "star": shape = { type: "star", ...box, ...common }; break;
      case "resistor": case "capacitor": case "inductor": case "battery": case "diode":
        shape = { type: tool, x1: sp.x, y1: sp.y, x2: cur.x, y2: cur.y, strokeColor, lineWidth }; break;
      case "voltmeter": case "ammeter":
        shape = { type: tool, x: sp.x, y: sp.y, radius: snap(Math.hypot(w, h)), strokeColor, lineWidth }; break;
      case "and-gate": case "or-gate": case "not-gate": case "nand-gate": case "nor-gate": case "xor-gate":
        shape = { type: tool, ...box, strokeColor, fillColor, lineWidth }; break;
      default: break;
    }
    if (shape) setCurrentShape(shape);
  };

  const onPointerUp = (e) => {
    if (isPalmPointer(e)) return;
    if (e.pointerType === "pen" && activePenPointerRef.current === e.pointerId) {
      activePenPointerRef.current = null;
    }
    pointerDownRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (panStartRef.current) { panStartRef.current = null; return; }
    if (erasingRef.current) {
      erasingRef.current = false;
      // One history entry for the whole erase stroke, not one per element.
      saveToHistory(elements);
      return;
    }
    if (resizeHandle) {
      setResizeHandle(null);
      resizeStartRef.current = null;
      saveToHistory(elements);
      return;
    }
    if (isDragging) {
      setIsDragging(false); setDragElementStart(null);
      saveToHistory(elements);
      return;
    }
    if (!isDrawing) return;
    setIsDrawing(false);
    let finalEl = null;
    if (tool === "pen" && tempPointsRef.current.length > 0) {
      finalEl = { id: generateId(), type: "pen", points: [...tempPointsRef.current], strokeColor, lineWidth, isDashed, created: Date.now(), modified: Date.now() };
    } else if (currentShape) {
      finalEl = { id: generateId(), ...currentShape, created: Date.now(), modified: Date.now() };
    }
    if (finalEl) {
      const next = [...elements, finalEl];
      setElements(next); saveToHistory(next); setSelectedId(finalEl.id);
    }
    setCurrentShape(null); tempPointsRef.current = [];
  };

  const onPointerCancel = (e) => {
    if (isPalmPointer(e)) return;
    if (e.pointerType === "pen" && activePenPointerRef.current === e.pointerId) {
      activePenPointerRef.current = null;
    }
    pointerDownRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    panStartRef.current = null;
    erasingRef.current = false;
    resizeStartRef.current = null;
    setResizeHandle(null);
    setIsDragging(false);
    setDragElementStart(null);
    setIsDrawing(false);
    setCurrentShape(null);
    tempPointsRef.current = [];
  };

  /* ---------- AI generation & preview ---------- */
  // Deterministic code for the current canvas / graph, recomputed as they change.
  const generatedCode = useMemo(() => {
    if (!hasCodeSource) return "";
    if (mode === "graph") {
      return generateTikzLocal({ mode, functions: visibleFunctions, xRange, yRange, graphConfig, projectName, canvasHeight: canvasH }).code;
    }
    return generateTikzLocal({ mode, elements: sanitize(elements), projectName, canvasHeight: canvasH }).code;
  }, [hasCodeSource, mode, elements, visibleFunctions, xRange, yRange, graphConfig, projectName, canvasH]);

  // Code generation is entirely local and deterministic: the TikZ is derived from
  // the relative positions of the elements on the canvas, so it is instant, works
  // offline, and always round-trips to exactly what was drawn.
  const generateTikZ = () => {
    setError(null);
    setCodeSource("canvas");
    setTikzCode(generatedCode);
    setOutputOpen(true);
    setOutputTab("code");
  };

  // Live regeneration, but only while the code pane is showing canvas-derived code.
  // Image-to-TikZ results and recovered autosaves are marked "external" so an
  // unrelated change (even a window resize) cannot silently overwrite them.
  useEffect(() => {
    if (codeSource !== "canvas") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTikzCode(generatedCode);
  }, [generatedCode, codeSource]);

  // Any canvas or graph edit hands control back to the generator.
  const firstEditRef = useRef(true);
  useEffect(() => {
    if (firstEditRef.current) { firstEditRef.current = false; return; }
    setCodeSource("canvas");
  }, [elements, functions, xRange, yRange, graphConfig, mode]);

  const previewResetRef = useRef(null);
  useEffect(() => () => clearTimeout(previewResetRef.current), []);

  // TikZJax renders previews entirely in the browser (WebAssembly TeX), so the
  // app runs on any static host — no pdflatex on the server. The engine runs
  // inside a hidden iframe (/tj/preview-host.html) for browsing-context
  // isolation: the React app's globals and re-renders do not interfere with
  // the TeX worker, which is what made in-page injection flaky. The iframe
  // posts back the serialized SVG (or an error) via postMessage.
  const [previewSvg, setPreviewSvg] = useState(null); // serialized SVG string
  const previewNonceRef = useRef(0);
  const previewHostRef = useRef(null); // { iframe, ready: Promise, resolveReady }
  const previewListenersRef = useRef(new Map()); // id -> { resolve, reject }

  // Bubble postMessage from the iframe into pending render promises.
  useEffect(() => {
    const onMessage = (ev) => {
      if (!ev.data || typeof ev.data !== "object") return;
      const { type, id, svg, error } = ev.data;
      if (type === "tikzjax-ready") {
        previewHostRef.current?.resolveReady?.();
      } else if (type === "tikz-done" && id) {
        const waiter = previewListenersRef.current.get(id);
        if (!waiter) return;
        previewListenersRef.current.delete(id);
        if (error) waiter.reject(new Error(error));
        else waiter.resolve(svg);
      } else if (type === "tikzjax-error") {
        previewHostRef.current?.rejectReady?.(new Error(error || "engine failed to load"));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const ensureTikzjax = useCallback(() => {
    if (previewHostRef.current?.ready) return previewHostRef.current.ready;
    let resolveReady, rejectReady;
    const ready = new Promise((res, rej) => { resolveReady = res; rejectReady = rej; });
    const iframe = document.createElement("iframe");
    iframe.src = "/tj/preview-host.html";
    iframe.style.cssText = "position:absolute;left:-99999px;top:0;width:1px;height:1px;border:0;";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");
    document.body.appendChild(iframe);
    previewHostRef.current = { iframe, ready, resolveReady, rejectReady };
    // If the engine never signals ready (e.g. blocked), fail after 30s.
    setTimeout(() => rejectReady(new Error("The TikZJax preview engine failed to load. Check your connection and try again.")), 30000);
    return ready;
  }, []);

  const renderPreview = async () => {
    if (!tikzCode) { setError("No TikZ code to render."); return; }
    if (tikzCode.length > MAX_TIKZ_CHARS) {
      setError(`This diagram is too large to preview (over ${MAX_TIKZ_CHARS.toLocaleString()} characters of TikZ). You can still copy or download the code.`);
      return;
    }
    setError(null);
    setRenderingPreview(true);
    setPreviewSvg(null);
    setPreviewProgress(0);
    setPreviewStatus("Loading TikZJax engine...");
    const nonce = ++previewNonceRef.current;
    let progressTimer = null;
    try {
      await ensureTikzjax();
      if (nonce !== previewNonceRef.current) return;
      setPreviewStatus("Compiling with TikZJax...");
      progressTimer = setInterval(() => setPreviewProgress((p) => Math.min(p + 8, 90)), 250);

      // Strip the leading `% Requires:` comment and rebuild package / library
      // lists the generator already computed. TikZJax ships pgfplots and the
      // tikz libraries but not circuitikz.sty, so let TeX report that itself.
      const body = tikzCode.replace(/^%\s*Requires:[^\n]*\n/, "").trim();
      const reqMatch = tikzCode.match(/^%\s*Requires:\s*(.+)$/m);
      const reqs = reqMatch ? reqMatch[1].split(/,\s*/) : [];
      const packages = {};
      const libs = [];
      for (const r of reqs) {
        if (r === "pgfplots") packages.pgfplots = "";
        else if (r === "circuitikz") packages.circuitikz = "";
        else libs.push(r);
      }
      const preamble = packages.pgfplots !== undefined ? "\n\\pgfplotsset{compat=1.18}\n" : "";

      const id = String(nonce);
      const svg = await new Promise((resolve, reject) => {
        previewListenersRef.current.set(id, { resolve, reject });
        previewHostRef.current.iframe.contentWindow.postMessage(
          { type: "tikz-render", id, code: body, packages, libraries: libs, preamble },
          "*",
        );
      });
      if (nonce !== previewNonceRef.current) return;
      setPreviewSvg(svg);
      setPreviewProgress(100);
      setPreviewStatus("Done");
      clearTimeout(previewResetRef.current);
      previewResetRef.current = setTimeout(() => { setPreviewStatus(""); setPreviewProgress(0); }, 500);
    } catch (err) {
      if (nonce !== previewNonceRef.current) return;
      setError(err.message || "Failed to render preview");
      setPreviewProgress(0); setPreviewStatus("");
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      if (nonce === previewNonceRef.current) setRenderingPreview(false);
    }
  };

  /* ---------- Save / Load / Export ---------- */
  const saveProject = () => {
    const proj = buildProjectSnapshot({
      name: projectName,
      elements,
      zoom,
      pan,
      showGrid,
      snapToGrid,
      mode,
      functions,
      xRange,
      yRange,
      graphConfig,
    });
    const serialized = safeStringify(proj);
    if (!serialized) {
      setError("Could not serialize project data.");
      return;
    }
    const safeName = (projectName || DEFAULT_PROJECT_NAME).replace(/[^a-z0-9]/gi, "_");
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = `${safeName}.tikz.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };
  const loadProject = (file) => {
    if (file.size > MAX_PROJECT_FILE_BYTES) {
      setError(`Project file is too large (max 25 MB) — that file is ${(file.size / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }
    const r = new FileReader();
    r.onload = (e) => {
      // parseProjectJson does its own try/catch, but restoring a structurally
      // valid yet hostile project could still throw; keep the editor alive.
      try {
        const project = parseProjectJson(e.target.result);
        if (!project) {
          setError("Failed to load project: invalid or unsupported project JSON.");
          return;
        }
        restoreViewport(project);
        resyncCanvasSize();
        setError(null);
      } catch (err) {
        console.error("Project load failed:", err);
        setError("Failed to load project: the file could not be restored.");
      }
    };
    r.onerror = () => setError("Could not read that project file.");
    r.readAsText(file);
  };
  const onFilePick = (e) => {
    const f = e.target.files?.[0];
    if (f) loadProject(f);
    e.target.value = "";
  };
  // Export the *diagram*, not the editor viewport: draw the elements alone onto an
  // offscreen canvas sized to their bounding box, so the PNG has no grid, selection
  // handles or eraser highlight, is not clipped by the current scroll/zoom, and is
  // rendered at 2x for crisp output on high-DPI displays.
  const EXPORT_SCALE = 2, EXPORT_MARGIN = 24;
  const exportPNG = () => {
    if (!elements.length) { setError("Nothing to export — the canvas is empty."); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      const b = getElementBounds(el, 4);
      if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) continue;
      minX = Math.min(minX, b.x); minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width); maxY = Math.max(maxY, b.y + b.height);
    }
    if (!Number.isFinite(minX)) { setError("Nothing to export."); return; }

    const w = Math.max(1, Math.ceil(maxX - minX) + EXPORT_MARGIN * 2);
    const h = Math.max(1, Math.ceil(maxY - minY) + EXPORT_MARGIN * 2);
    const off = document.createElement("canvas");
    off.width = w * EXPORT_SCALE;
    off.height = h * EXPORT_SCALE;
    const ctx = off.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);
    ctx.translate(EXPORT_MARGIN - minX, EXPORT_MARGIN - minY);
    elements.forEach((el) => drawElement(ctx, el));

    const safeName = (projectName || DEFAULT_PROJECT_NAME).replace(/[^a-z0-9]/gi, "_");
    off.toBlob((blob) => {
      if (!blob) { setError("Could not export the canvas as a PNG."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${safeName}.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    });
  };

  /* ---------- Graph mode: function management & plotting ---------- */
  const addFunction = () => {
    const id = `f${fnIdCounter}`;
    setFnIdCounter((n) => n + 1);
    const colors = ["#2563eb", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899"];
    setFunctions((fns) => [...fns, { id, expr: "x", color: colors[fns.length % colors.length], visible: true }]);
  };
  const updateFunction = (id, patch) => setFunctions((fns) => fns.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const removeFunction = (id) => setFunctions((fns) => fns.filter((f) => f.id !== id));

  const compiledFns = useMemo(
    () => functions.map((f) => {
      try { return { ...f, fn: compileFn(f.expr), error: null }; }
      catch (err) { return { ...f, fn: null, error: err.message }; }
    }),
    [functions]
  );

  const renderGraph = useCallback(() => {
    const c = graphCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, H);

    // Guard against an inverted or zero-width range typed into the axis inputs,
    // which would otherwise divide by zero in sx()/sy() and blank the canvas.
    const [xMin, xMax] = safeRange(xRange, [-10, 10]);
    const [yMin, yMax] = safeRange(yRange, [-6, 6]);
    const cfg = graphConfig;
    const { padL, padR, padT, padB } = graphPadding(cfg);
    const pw = W - padL - padR, ph = H - padT - padB;
    const sx = (xv) => padL + ((xv - xMin) / (xMax - xMin)) * pw;
    const sy = (yv) => padT + (1 - (yv - yMin) / (yMax - yMin)) * ph;
    const xSpan = xMax - xMin, ySpan = yMax - yMin;

    // ---- Grid ----
    if (cfg.gridStyle !== "none") {
      // minor grid
      if (cfg.showMinorTicks && cfg.gridStyle === "both") {
        ctx.strokeStyle = "#f3f4f6"; ctx.lineWidth = 1;
        const minorStepX = xSpan <= 20 ? 0.2 : 0.5;
        for (let v = Math.ceil(xMin / minorStepX) * minorStepX; v <= xMax; v += minorStepX) {
          const X = sx(v); ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + ph); ctx.stroke();
        }
        const minorStepY = ySpan <= 20 ? 0.2 : 0.5;
        for (let v = Math.ceil(yMin / minorStepY) * minorStepY; v <= yMax; v += minorStepY) {
          const Y = sy(v); ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + pw, Y); ctx.stroke();
        }
      }
      // major grid
      ctx.strokeStyle = "#e5e7eb"; ctx.lineWidth = 1;
      for (let i = Math.ceil(xMin); i <= xMax; i++) { const X = sx(i); ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + ph); ctx.stroke(); }
      for (let i = Math.ceil(yMin); i <= yMax; i++) { const Y = sy(i); ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + pw, Y); ctx.stroke(); }
    }

    // ---- Axes ----
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 1.4;
    if (yMin <= 0 && yMax >= 0) { const Y = sy(0); ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + pw, Y); ctx.stroke(); }
    if (xMin <= 0 && xMax >= 0) { const X = sx(0); ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + ph); ctx.stroke(); }
    // border box
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, pw, ph);

    // ---- Ticks ----
    ctx.strokeStyle = "#475569"; ctx.lineWidth = 1;
    ctx.fillStyle = "#475569"; ctx.font = "10.5px sans-serif";
    // X major ticks
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    if (cfg.showMajorTicks) {
      for (let i = Math.ceil(xMin); i <= xMax; i++) {
        const X = sx(i);
        ctx.beginPath(); ctx.moveTo(X, padT + ph); ctx.lineTo(X, padT + ph + 5); ctx.stroke();
        ctx.fillText(String(i), X, padT + ph + 7);
      }
      // X minor ticks
      if (cfg.showMinorTicks) {
        const step = xSpan <= 20 ? 0.2 : 0.5;
        for (let v = Math.ceil(xMin / step) * step; v <= xMax; v += step) {
          if (Math.abs(v - Math.round(v)) < 1e-9) continue;
          const X = sx(v);
          ctx.beginPath(); ctx.moveTo(X, padT + ph); ctx.lineTo(X, padT + ph + 3); ctx.stroke();
        }
      }
    }
    // Y major ticks
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    if (cfg.showMajorTicks) {
      for (let i = Math.ceil(yMin); i <= yMax; i++) {
        const Y = sy(i);
        ctx.beginPath(); ctx.moveTo(padL - 5, Y); ctx.lineTo(padL, Y); ctx.stroke();
        ctx.fillText(String(i), padL - 7, Y);
      }
      if (cfg.showMinorTicks) {
        const step = ySpan <= 20 ? 0.2 : 0.5;
        for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) {
          if (Math.abs(v - Math.round(v)) < 1e-9) continue;
          const Y = sy(v);
          ctx.beginPath(); ctx.moveTo(padL - 3, Y); ctx.lineTo(padL, Y); ctx.stroke();
        }
      }
    }

    // ---- Axis labels ----
    ctx.fillStyle = "#1f2937"; ctx.font = "12px sans-serif";
    if (cfg.xLabel) { ctx.textAlign = "center"; ctx.textBaseline = "bottom"; ctx.fillText(cfg.xLabel, padL + pw / 2, H - 6); }
    if (cfg.yLabel) {
      ctx.save(); ctx.translate(12, padT + ph / 2); ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(cfg.yLabel, 0, 0); ctx.restore();
    }
    if (cfg.title) {
      ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(cfg.title, padL + pw / 2, 8);
    }

    // ---- Plot functions ----
    ctx.save();
    ctx.beginPath(); ctx.rect(padL, padT, pw, ph); ctx.clip();
    compiledFns.forEach((f) => {
      if (!f.visible || !f.fn) return;
      ctx.strokeStyle = f.color; ctx.lineWidth = 2; ctx.beginPath();
      let pen = false;
      for (let px = 0; px <= pw; px++) {
        const xv = xMin + (px / pw) * xSpan;
        let yv;
        try { yv = f.fn(xv); } catch { yv = NaN; }
        if (!isFinite(yv)) { pen = false; continue; }
        const py = sy(yv);
        if (py < padT - 200 || py > padT + ph + 200) { pen = false; continue; }
        if (!pen) { ctx.moveTo(sx(xv), py); pen = true; } else ctx.lineTo(sx(xv), py);
      }
      ctx.stroke();
    });

    // data labels (value at endpoints of each visible curve)
    if (cfg.showDataLabels) {
      ctx.font = "10px sans-serif";
      compiledFns.forEach((f) => {
        if (!f.visible || !f.fn) return;
        // label at x = xMax
        try {
          const yv = f.fn(xMax);
          if (isFinite(yv)) {
            const py = sy(yv);
            if (py >= padT && py <= padT + ph) {
              ctx.fillStyle = f.color; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
              ctx.fillText(`${yv.toFixed(2)}`, padL + pw - 4, py - 4);
            }
          }
        } catch {}
      });
    }

    // hover marker
    if (graphHoverX != null && graphHoverX >= xMin && graphHoverX <= xMax) {
      const X = sx(graphHoverX);
      ctx.strokeStyle = "#cbd5e1"; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + ph); ctx.stroke(); ctx.setLineDash([]);
      compiledFns.forEach((f) => {
        if (!f.visible || !f.fn) return;
        let yv; try { yv = f.fn(graphHoverX); } catch { yv = NaN; }
        if (!isFinite(yv)) return;
        const Y = sy(yv);
        if (Y < padT || Y > padT + ph) return;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(X, Y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1f2937"; ctx.font = "11px sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
        ctx.fillText(`${f.expr} = ${yv.toFixed(3)}`, X + 8, Y - 6);
      });
    }
    ctx.restore();

    // ---- Legend ----
    if (cfg.showLegend) {
      const visible = compiledFns.filter((f) => f.visible && f.fn);
      if (visible.length) {
        ctx.font = "11px sans-serif";
        const boxW = 18 + Math.max(...visible.map((f) => f.expr.length)) * 6.2;
        const boxH = visible.length * 16 + 8;
        const pos = cfg.legendPosition || "north east";
        let bx, by;
        if (pos.includes("west")) bx = padL + 8;
        else bx = padL + pw - boxW - 8;
        if (pos.includes("south")) by = padT + ph - boxH - 8;
        else by = padT + 8;
        ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1;
        ctx.fillRect(bx, by, boxW, boxH); ctx.strokeRect(bx, by, boxW, boxH);
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        visible.forEach((f, i) => {
          const ly = by + 8 + i * 16;
          ctx.strokeStyle = f.color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(bx + 6, ly); ctx.lineTo(bx + 22, ly); ctx.stroke();
          ctx.fillStyle = "#1f2937"; ctx.fillText(f.expr, bx + 26, ly);
        });
      }
    }
  }, [compiledFns, graphConfig, graphHoverX, xRange, yRange]);

  // Sizing is separate from drawing. Previously both lived in one effect keyed on
  // graphHoverX, so every mouse move reassigned canvas.width — resetting the whole
  // 2D context — and re-registered the resize listener.
  // renderGraph is read through a ref so that hover changes (which rebuild the
  // callback) do not tear down and re-register the resize listener.
  const renderGraphRef = useRef(renderGraph);
  useEffect(() => { renderGraphRef.current = renderGraph; }, [renderGraph]);
  useEffect(() => {
    if (mode !== "graph") return;
    const resize = () => {
      const c = graphCanvasRef.current;
      const wrap = graphContainerRef.current;
      if (!c || !wrap) return;
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      renderGraphRef.current();
    };
    resize();
    const t = setTimeout(resize, 60);
    window.addEventListener("resize", resize);
    return () => { clearTimeout(t); window.removeEventListener("resize", resize); };
  }, [mode]);

  // Redraw only, on data/hover changes.
  useEffect(() => {
    if (mode === "graph") renderGraph();
  }, [mode, renderGraph]);

  const onGraphMove = (e) => {
    const c = graphCanvasRef.current; if (!c) return;
    const r = c.getBoundingClientRect();
    if (!r.width) return;
    // Use the same padding renderGraph draws with, and convert the CSS-pixel
    // cursor offset into the canvas buffer's coordinate space.
    const { padL, padR } = graphPadding(graphConfig);
    const pw = c.width - padL - padR;
    const px = (e.clientX - r.left) * (c.width / r.width);
    if (px < padL || px > padL + pw) { setGraphHoverX(null); return; }
    const [xMin, xMax] = safeRange(xRange, [-10, 10]);
    setGraphHoverX(xMin + ((px - padL) / pw) * (xMax - xMin));
  };

  /* ---------- Canvas renderer (diagram mode) ---------- */
  const renderDiagram = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fbfbfc"; ctx.fillRect(0, 0, c.width, c.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Grid is drawn *inside* the pan/zoom transform so its lines coincide with the
    // positions snap-to-grid actually snaps to. Bounds are the visible viewport
    // expressed in canvas coordinates.
    if (showGrid) {
      const left = -pan.x / zoom, top = -pan.y / zoom;
      const right = (c.width - pan.x) / zoom, bottom = (c.height - pan.y) / zoom;
      ctx.save();
      ctx.strokeStyle = "#e7e9ee"; ctx.lineWidth = 1 / zoom;
      ctx.beginPath();
      for (let x = Math.floor(left / gridSize) * gridSize; x <= right; x += gridSize) {
        ctx.moveTo(x, top); ctx.lineTo(x, bottom);
      }
      for (let y = Math.floor(top / gridSize) * gridSize; y <= bottom; y += gridSize) {
        ctx.moveTo(left, y); ctx.lineTo(right, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    elements.forEach((el) => drawElement(ctx, el));
    if (isDrawing && currentShape) drawElement(ctx, currentShape);

    // selection overlay
    if (selectedId) {
      const el = elements.find((e) => e.id === selectedId);
      if (el) {
        // Line/arrow elements: draw endpoint handles, not box
        if ((el.type === "line" || el.type === "arrow" || LINE_KINDS.has(el.type)) && el.x1 !== undefined) {
          const hs = 8 / zoom;
          ctx.save();
          if (el.rotation) {
            const cx = (el.x1 + el.x2) / 2, cy = (el.y1 + el.y2) / 2;
            ctx.translate(cx, cy);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          // Faint bounding line
          const b = getElementBounds(el);
          ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1 / zoom; ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.strokeRect(b.x, b.y, b.width, b.height); ctx.setLineDash([]);
          // Endpoint circles
          ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1.5 / zoom;
          [[el.x1, el.y1], [el.x2, el.y2]].forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(px, py, hs / 2 + 1, 0, 2 * Math.PI);
            ctx.fill(); ctx.stroke();
          });
          ctx.restore();
        } else {
          const b = getElementBounds(el);
          const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
          // Draw selection box + handles in the element's rotated frame
          ctx.save();
          if (el.rotation) {
            ctx.translate(cx, cy);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.translate(-cx, -cy);
          }
          ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([5 / zoom, 5 / zoom]);
          ctx.strokeRect(b.x, b.y, b.width, b.height); ctx.setLineDash([]);
          // 8 resize handles
          const hs = 8 / zoom;
          const midX = b.x + b.width / 2, midY = b.y + b.height / 2;
          const handles = [
            [b.x, b.y], [midX, b.y], [b.x + b.width, b.y],
            [b.x + b.width, midY], [b.x + b.width, b.y + b.height],
            [midX, b.y + b.height], [b.x, b.y + b.height], [b.x, midY],
          ];
          ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1.5 / zoom;
          handles.forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
            ctx.fill(); ctx.stroke();
          });
          // rotation handle (small circle above top edge)
          const rotY = b.y - 22 / zoom;
          ctx.beginPath();
          ctx.moveTo(midX, b.y); ctx.lineTo(midX, rotY);
          ctx.strokeStyle = "#2563eb"; ctx.stroke();
          ctx.beginPath();
          ctx.arc(midX, rotY, 5 / zoom, 0, 2 * Math.PI);
          ctx.fillStyle = "#2563eb"; ctx.fill();
          ctx.restore();
        }
      }
    }

    // eraser hover
    if (tool === "eraser" && hoveredId) {
      const el = elements.find((e) => e.id === hoveredId);
      if (el) {
        const b = getElementBounds(el);
        ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 2 / zoom; ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.strokeRect(b.x, b.y, b.width, b.height); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }, [elements, zoom, pan, showGrid, gridSize, selectedId, hoveredId, isDrawing, currentShape, tool]);

  // Re-render diagram canvas whenever relevant state changes. renderDiagram is a
  // useCallback so the linter keeps this dependency list honest — `tool` used to be
  // missing, which left the eraser's hover box painted after switching tools.
  useEffect(() => {
    if (mode === "diagram") renderDiagram();
  }, [mode, renderDiagram, renderTick]);

  /* =========================================================================
   * JSX
   * ========================================================================= */
  const filteredShapes = useMemo(() => {
    const q = shapeSearch.trim().toLowerCase();
    if (!q) return SHAPES.filter((s) => s.category === activeCategory);
    return SHAPES.filter((s) => s.label.toLowerCase().includes(q) || s.kind.toLowerCase().includes(q));
  }, [shapeSearch, activeCategory]);

  const cursorClass =
    tool === "select" ? (hoveredId ? "cursor-move" : "cursor-default") :
    tool === "eraser" ? "cursor-not-allowed" :
    pendingShape ? "cursor-copy" : "cursor-crosshair";
  const onFileLabelKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.querySelector("input")?.click();
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--background)] overflow-hidden">
      {/* ================= TOP TOOLBAR ================= */}
      <header className="tm-topbar">
        <div className="tm-brand">
          <span className="tm-logo">T</span>
          <span className="hidden sm:inline">TikZ Studio</span>
        </div>

        {/* mode segmented */}
        <div className="tm-segmented">
          <button className={cx(mode === "diagram" && "is-active")} onClick={() => setMode("diagram")}>Diagram</button>
          <button className={cx(mode === "graph" && "is-active")} onClick={() => setMode("graph")}>Graph</button>
        </div>

        {mode === "diagram" && (
          <>
            <div className="tm-divider" />
            {/* tools */}
            <button className={cx("tm-tool tip", tool === "select" && "is-active")} data-tip="Select (V)" onClick={() => { setTool("select"); setPendingShape(null); }}>
              <Icon name="pointer" />
            </button>
            <button className={cx("tm-tool tip", tool === "pen" && "is-active")} data-tip="Pen (P)" onClick={() => { setTool("pen"); setPendingShape(null); }}>
              <Icon name="pen" />
            </button>
            <button className={cx("tm-tool tip", tool === "text" && "is-active")} data-tip="Text" onClick={() => { setTool("text"); setPendingShape(null); }}>
              <Icon name="text" />
            </button>
            <button className={cx("tm-tool tip", tool === "eraser" && "is-active")} data-tip="Eraser (E)" onClick={() => { setTool("eraser"); setPendingShape(null); }}>
              <Icon name="eraser" />
            </button>
            <div className="tm-divider" />
            {/* shapes popover trigger */}
            <button className={cx("tm-tool tip", !!pendingShape && "is-active")} data-tip="Shapes" onClick={() => setShapePopoverOpen((v) => !v)}>
              <Icon name="shapes" />
            </button>

            <div className="tm-divider" />
            <button className="tm-tool tip" data-tip="Undo (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo}><Icon name="undo" /></button>
            <button className="tm-tool tip" data-tip="Redo (Ctrl+Y)" onClick={handleRedo} disabled={!canRedo}><Icon name="redo" /></button>
            <button className="tm-tool tip" data-tip="Clear all" onClick={clearAll}><Icon name="trash" /></button>
          </>
        )}

        <div style={{ flex: 1 }} />

        {/* project name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="prop-input !w-40 !text-[12.5px] !font-semibold !border-transparent !bg-transparent hover:!bg-[#eef1f5] focus:!bg-white focus:!border-[var(--border-2)]"
          placeholder="Untitled"
        />

        <div className="tm-divider" />

        {/* file ops */}
        <button className="tm-btn tm-btn-ghost tip" data-tip="Save project" onClick={saveProject}><Icon name="save" /></button>
        <label className="tm-btn tm-btn-ghost tip cursor-pointer" data-tip="Open project" tabIndex={0} role="button" onKeyDown={onFileLabelKeyDown}>
          <Icon name="open" />
          <input type="file" accept=".json" onChange={onFilePick} className="hidden" />
        </label>
        {mode === "diagram" && (
          <button className="tm-btn tm-btn-ghost tip" data-tip="Export PNG" onClick={exportPNG}><Icon name="image" /></button>
        )}

        {/* panel toggles */}
        <button className={cx("tm-tool tip", rightPanelOpen && "is-active")} data-tip="Properties panel" onClick={() => setRightPanelOpen((v) => !v)}>
          <Icon name="panelRight" />
        </button>
        <button className={cx("tm-tool tip", outputOpen && "is-active")} data-tip="Code & preview" onClick={() => setOutputOpen((v) => !v)}>
          <Icon name="code" />
        </button>

        <div className="tm-divider" />
        <button
          onClick={() => { generateTikZ(); }}
          disabled={!hasCodeSource}
          className="tm-btn tm-btn-primary"
        >
          <Icon name="code" />
          <span>View Code</span>
        </button>
      </header>

      {/* ================= BODY ================= */}
      <div className="flex-1 flex overflow-hidden relative">
        {mode === "diagram" ? (
          <>
            {/* shape popover */}
            {shapePopoverOpen && (
              <>
                <div className="tm-overlay" onClick={() => setShapePopoverOpen(false)} />
                <div className="tm-popover">
                  <div className="tm-popover-head">
                    <div className="tm-cat-tabs">
                      {CATEGORIES.map((c) => (
                        <button key={c} className={cx("tm-cat-tab", activeCategory === c && "is-active")} onClick={() => { setActiveCategory(c); setShapeSearch(""); }}>{c}</button>
                      ))}
                    </div>
                    <div className="flex-1" />
                    <input autoFocus type="text" value={shapeSearch} onChange={(e) => setShapeSearch(e.target.value)} placeholder="Search…" className="prop-input !text-[12px] !w-28" />
                  </div>
                  <div className="tm-shape-grid">
                    {filteredShapes.map((s) => (
                      <button key={s.kind} className={cx("tm-shape-tile", pendingShape === s.kind && "is-active")} onClick={() => { requestPlace(s.kind); setShapePopoverOpen(false); }} title={s.label}>
                        <Glyph>{s.glyph}</Glyph>
                        <span className="truncate w-full">{s.label}</span>
                      </button>
                    ))}
                    {filteredShapes.length === 0 && <div className="col-span-full text-center text-xs text-slate-400 py-4">No shapes</div>}
                  </div>
                </div>
              </>
             )}

            {/* CANVAS */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 relative overflow-hidden" ref={containerRef} style={{ background: "var(--canvas-bg)" }}>
                <canvas
                  ref={canvasRef}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerCancel={onPointerCancel}
                  className={cx("touch-none w-full h-full", cursorClass)}
                />
                <div className="tm-status">
                  {pendingShape ? `Place: ${pendingShape}` : tool === "select" ? "Select" : tool === "pen" ? "Drawing" : tool === "text" ? "Text" : tool === "eraser" ? "Erase" : "Diagram"}
                  {" · "}
                  {elements.length} obj
                  {selectedElement && <> · <span style={{ color: "var(--accent)", fontWeight: 600 }}>{selectedElement.type}</span></>}
                </div>
                {/* zoom control */}
                <div className="tm-zoom">
                  <button onClick={zoomOut} className="tip" data-tip="Zoom out">−</button>
                  <span onClick={zoomReset} className="cursor-pointer">{Math.round(zoom * 100)}%</span>
                  <button onClick={zoomIn} className="tip" data-tip="Zoom in">+</button>
                </div>
              </div>

              {/* code dock */}
              {outputOpen && (
                <>
                <div
                  className="resizer-h"
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label="Resize code panel"
                  onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}; resizingOutputRef.current = true; document.body.style.cursor = "row-resize"; }}
                />
                <div style={{ height: outputHeight }} className="tm-dock">
                  <div className="tm-dock-head">
                    <div className="tm-segmented">
                      <button className={cx(outputTab === "code" && "is-active")} onClick={() => setOutputTab("code")}>Code</button>
                      <button className={cx(outputTab === "preview" && "is-active")} onClick={() => setOutputTab("preview")}>Preview</button>
                    </div>
                    <div className="flex-1" />
                    {outputTab === "code" && (
                      <button onClick={() => navigator.clipboard.writeText(tikzCode)} disabled={!tikzCode} className="tm-btn tm-btn-ghost !h-7 disabled:opacity-40">
                        <Icon name="copy" /> Copy
                      </button>
                    )}
                    {outputTab === "preview" && (
                      <>
                        <button onClick={renderPreview} disabled={!tikzCode || renderingPreview} className="tm-btn tm-btn-ghost !h-7 disabled:opacity-40">
                          {renderingPreview ? <span className="spinner spinner-dark" /> : <Icon name="play" />} Render
                        </button>
                        {previewSvg && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => setPreviewZoom((z) => Math.max(0.1, (typeof z === "number" ? z : 1) - 0.1))} className="tm-btn tm-btn-ghost !h-6 !px-1.5" title="Zoom out">−</button>
                            <span className="text-[11px] font-mono w-9 text-center text-slate-500">{typeof previewZoom === "number" ? Math.round(previewZoom * 100) + "%" : "Fit"}</span>
                            <button onClick={() => setPreviewZoom((z) => Math.min(4, (typeof z === "number" ? z : 1) + 0.1))} className="tm-btn tm-btn-ghost !h-6 !px-1.5" title="Zoom in">+</button>
                            <button onClick={() => setPreviewZoom("fit")} className="tm-btn tm-btn-ghost !h-6 !px-2 text-[11px]" title="Fit to window">Fit</button>
                            <button onClick={() => setPreviewZoom(1)} className="tm-btn tm-btn-ghost !h-6 !px-2 text-[11px]" title="100%">1:1</button>
                          </div>
                        )}
                      </>
                    )}
                    <button onClick={() => setOutputOpen(false)} className="tm-btn tm-btn-ghost !h-7 !px-2">✕</button>
                  </div>
                  <div className="flex-1 overflow-auto relative">
                    {outputTab === "code" ? (
                      <textarea value={tikzCode} onChange={(e) => setTikzCode(e.target.value)} className="code-area w-full h-full p-3 border-0 resize-none focus:outline-none" placeholder="No TikZ code yet" />
                    ) : renderingPreview ? (
                      <div className="p-3">
                        <div className="flex justify-between text-xs text-slate-600 mb-1"><span>{previewStatus}</span><span className="font-semibold text-blue-600">{previewProgress}%</span></div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 transition-all" style={{ width: `${previewProgress}%` }} /></div>
                      </div>
                    ) : previewSvg ? (
                      <div ref={previewWrapRef} className="h-full w-full overflow-auto bg-slate-50 grid place-items-center" style={{ minHeight: 0 }}>
                        <PreviewSvg svg={previewSvg} zoom={previewZoom} wrapRef={previewWrapRef} />
                      </div>
                    ) : (
                      <div className="grid place-items-center h-full text-slate-400 text-sm">{tikzCode ? "No preview yet" : "No TikZ code yet"}</div>
                    )}
                  </div>
                </div>
                </>
              )}
            </div>

            {/* RIGHT PANEL */}
            {rightPanelOpen && (
              <>
              <div
                className="resizer-v"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize properties panel"
                onPointerDown={(e) => { e.preventDefault(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}; resizingRightRef.current = true; document.body.style.cursor = "col-resize"; }}
              />
              <aside style={{ width: rightWidth }} className="tm-right">
                <div className="tm-right-head">
                  <span>{selectedElement ? "Properties" : "Document"}</span>
                  <button onClick={() => setRightPanelOpen(false)} className="tm-btn tm-btn-ghost !h-6 !px-2 text-slate-400">✕</button>
                </div>
                <div className="tm-right-body">
                  {selectedElement ? (
                    <PropertiesPanel el={selectedElement} update={(k, v) => updateElementProperty(selectedElement.id, k, v)} commit={commitHistory} onDuplicate={duplicateSelected} onDelete={deleteSelected} />
                  ) : (
                    <div className="space-y-4">
                      {/* Text tool options (shown when Text tool is active) */}
                      {tool === "text" && (
                        <div className="space-y-2 p-3 rounded-md border border-blue-200 bg-blue-50/40">
                          <div className="flex items-center justify-between">
                            <span className="prop-label !mb-0">Text label</span>
                            <span className="text-[10px] text-blue-600 font-semibold">click canvas to place</span>
                          </div>
                          <input type="text" value={textLabel} onChange={(e) => setTextLabel(e.target.value)} className="prop-input" placeholder="Type label…" />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="prop-label">Size</label>
                              <input type="number" min="8" max="120" value={textFontSize} onChange={(e) => setTextFontSize(+e.target.value)} className="prop-input" />
                            </div>
                            <div>
                              <label className="prop-label">Font</label>
                              <select value={textFontFamily} onChange={(e) => setTextFontFamily(e.target.value)} className="prop-input">
                                <option value="sans-serif">Sans</option>
                                <option value="serif">Serif</option>
                                <option value="monospace">Mono</option>
                                <option value="cursive">Cursive</option>
                                <option value="Georgia">Georgia</option>
                                <option value="Times New Roman">Times</option>
                              </select>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                            <input type="checkbox" checked={textIsLatex} onChange={(e) => setTextIsLatex(e.target.checked)} /> LaTeX formula
                          </label>
                        </div>
                      )}
                      <div>
                        <label className="prop-label">Stroke color</label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={strokeColor} onChange={(e) => setStrokeColor(e.target.value)} className="w-9 h-7 rounded border border-[var(--border-2)] cursor-pointer" />
                          <span className="text-[11px] font-mono text-slate-500">{strokeColor.toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 mt-1.5">
                          {COLOR_PRESETS.slice(0, 10).map((c) => (
                            <button key={c} onClick={() => setStrokeColor(c)} className="w-6 h-6 rounded border border-slate-300 hover:scale-110 transition" style={{ background: c }} />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="prop-label">Line width: {lineWidth}px</label>
                        <input type="range" min="1" max="12" value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)} className="w-full" />
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Grid</label>
                        <label className="flex items-center gap-1.5 text-[12px] cursor-pointer"><input type="checkbox" checked={snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} /> Snap</label>
                      </div>
                      <div className="pt-3 border-t border-[var(--border)] text-[11px] text-slate-500 leading-relaxed">
                        <p className="font-semibold text-slate-700 mb-1">Tips</p>
                        <p>Click <Icon name="shapes" className="inline-block w-3 h-3" /> to browse shapes, then click canvas to place.</p>
                        <p className="mt-1">Drag handles to resize • drag the round handle to rotate.</p>
                        <p className="mt-1">Pan: scroll, middle-drag, or hold <kbd>Space</kbd> and drag. Zoom: <kbd>Ctrl</kbd>+scroll.</p>
                        <p className="mt-1">Shortcuts: <kbd>V</kbd> select · <kbd>P</kbd> pen · <kbd>E</kbd> erase · <kbd>Del</kbd> delete · <kbd>Ctrl+Z</kbd> undo</p>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
              </>
            )}
          </>
        ) : (
          /* ============== GRAPHING MODE ============== */
          <GraphingMode
            functions={functions}
            compiledFns={compiledFns}
            xRange={xRange}
            yRange={yRange}
            graphConfig={graphConfig}
            setGraphConfig={setGraphConfig}
            graphCanvasRef={graphCanvasRef}
            graphContainerRef={graphContainerRef}
            onMove={onGraphMove}
            onLeave={() => setGraphHoverX(null)}
            addFunction={addFunction}
            updateFunction={updateFunction}
            removeFunction={removeFunction}
            setXRange={setXRange}
            setYRange={setYRange}
            error={error}
          />
        )}
      </div>

      {error && mode !== "graph" && (
        <div role="alert" aria-live="assertive" className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {error}
          <button aria-label="Dismiss error" className="ml-3 opacity-80 hover:opacity-100" onClick={() => setError(null)}>✕</button>
        </div>
      )}

    </div>
  );
}



/* =========================================================================
 * PURE HELPERS (outside component to avoid re-creation)
 * hit detection & bounds. Lifted from original, extended for new shape kinds.
 * ========================================================================= */
const BOX_KINDS = new Set([
  "rect", "rounded-rect", "parallelogram", "process", "terminator", "document",
  "and-gate", "or-gate", "not-gate", "nand-gate", "nor-gate", "xor-gate",
  "rhombus", "pentagon", "hexagon", "star", "triangle", "decision",
]);
const CIRC_KINDS = new Set(["circle", "voltmeter", "ammeter", "connector"]);
const POLY_KINDS = new Set(["rhombus", "pentagon", "hexagon", "star", "triangle", "decision"]);
const LINE_KINDS = new Set(["line", "arrow", "resistor", "capacitor", "inductor", "battery", "diode"]);

function isPointInElement(x, y, el, tol = 6) {
  // Inverse-rotate the test point into the element's local (unrotated) frame
  if (el.rotation) {
    let cx, cy;
    if (LINE_KINDS.has(el.type)) { cx = (el.x1 + el.x2) / 2; cy = (el.y1 + el.y2) / 2; }
    else if (CIRC_KINDS.has(el.type) || el.type === "ellipse") { cx = el.x; cy = el.y; }
    else if (el.type === "text") { cx = el.x; cy = el.y - (el.fontSize || 16) / 2; }
    else if ((el.type === "pen" || el.type === "sine") && el.points?.length) {
      const b = getElementBounds(el, 0); cx = b.x + b.width / 2; cy = b.y + b.height / 2;
    }
    else { cx = (el.x || 0) + (el.width || 0) / 2; cy = (el.y || 0) + (el.height || 0) / 2; }
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

/* =========================================================================
 * CANVAS DRAWING PRIMITIVES
 * ========================================================================= */
function drawElement(ctx, el) {
  ctx.save();

  // Rotation around the element center (if any)
  if (el.rotation) {
    let cx, cy;
    if (LINE_KINDS.has(el.type)) {
      cx = (el.x1 + el.x2) / 2; cy = (el.y1 + el.y2) / 2;
    } else if (CIRC_KINDS.has(el.type)) {
      cx = el.x; cy = el.y;
    } else if (el.type === "ellipse") {
      cx = el.x; cy = el.y;
    } else if (el.type === "text") {
      cx = el.x; cy = el.y - (el.fontSize || 16) / 2;
    } else if ((el.type === "pen" || el.type === "sine") && el.points?.length) {
      const b = getElementBounds(el, 0); cx = b.x + b.width / 2; cy = b.y + b.height / 2;
    } else {
      cx = (el.x || 0) + (el.width || 0) / 2;
      cy = (el.y || 0) + (el.height || 0) / 2;
    }
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  // Apply fill opacity
  if (el.fillColor && el.fillColor !== "transparent" && el.fillOpacity != null && el.fillOpacity < 1) {
    ctx.globalAlpha = el.fillOpacity;
  }

  ctx.strokeStyle = el.strokeColor || "#1f2937";
  ctx.lineWidth = el.lineWidth || 2;
  ctx.fillStyle = el.fillColor && el.fillColor !== "transparent" ? el.fillColor : "transparent";
  ctx.setLineDash(el.isDashed ? [8, 6] : []);
  ctx.lineJoin = "round"; ctx.lineCap = "round";

  const fill = () => { if (el.fillColor && el.fillColor !== "transparent") ctx.fill(); };

  switch (el.type) {
    case "rect":
      ctx.strokeRect(el.x, el.y, el.width, el.height); fill(); break;
    case "rounded-rect":
      roundRect(ctx, el.x, el.y, el.width, el.height, el.cornerRadius || 12); ctx.stroke(); fill(); break;
    case "circle":
      ctx.beginPath(); ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI); ctx.stroke(); fill(); break;
    case "ellipse":
      ctx.beginPath(); ctx.ellipse(el.x, el.y, el.rx, el.ry, 0, 0, 2 * Math.PI); ctx.stroke(); fill(); break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(el.x + el.width / 2, el.y);
      ctx.lineTo(el.x, el.y + el.height);
      ctx.lineTo(el.x + el.width, el.y + el.height);
      ctx.closePath(); ctx.stroke(); fill(); break;
    case "line":
    case "arrow": {
      ctx.beginPath(); ctx.moveTo(el.x1, el.y1); ctx.lineTo(el.x2, el.y2); ctx.stroke();
      if (el.hasArrow || el.type === "arrow") drawArrowhead(ctx, el.x1, el.y1, el.x2, el.y2, el.strokeColor);
      break;
    }
    case "pen":
      if (el.points?.length > 0) {
        const hasPressure = !el.isDashed && el.points.some((point) => Number.isFinite(point.pressure));
        if (hasPressure && el.points.length > 1) {
          for (let index = 1; index < el.points.length; index += 1) {
            const previous = el.points[index - 1];
            const point = el.points[index];
            const pressure = ((previous.pressure ?? 0.5) + (point.pressure ?? 0.5)) / 2;
            ctx.lineWidth = (el.lineWidth || 2) * (0.5 + pressure);
            ctx.beginPath();
            ctx.moveTo(previous.x, previous.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
        } else {
          ctx.beginPath(); ctx.moveTo(el.points[0].x, el.points[0].y);
          el.points.forEach((p) => ctx.lineTo(p.x, p.y));
          ctx.stroke();
        }
      }
      break;
    case "text": {
      const fs = el.fontSize || 18;
      const fam = el.fontFamily || "sans-serif";
      ctx.font = `${el.isLatex ? "italic " : ""}${fs}px ${fam}`;
      ctx.fillStyle = el.strokeColor || "#1f2937";
      ctx.textBaseline = "alphabetic";
      const display = el.isLatex ? (el.text || "").replace(/\\\w+\{|}|\\|_/g, "") : (el.text || "Label");
      ctx.fillText(display, el.x, el.y);
      // small marker indicating LaTeX mode
      if (el.isLatex) {
        const w = ctx.measureText(display).width;
        ctx.fillStyle = "#8b5cf6";
        ctx.font = `9px ${fam}`;
        ctx.fillText("TeX", el.x + w + 4, el.y);
      }
      break;
    }
    case "parallelogram": {
      const sk = el.width * 0.2;
      ctx.beginPath();
      ctx.moveTo(el.x + sk, el.y);
      ctx.lineTo(el.x + el.width, el.y);
      ctx.lineTo(el.x + el.width - sk, el.y + el.height);
      ctx.lineTo(el.x, el.y + el.height);
      ctx.closePath(); ctx.stroke(); fill(); break;
    }
    case "rhombus":
    case "decision": {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      ctx.beginPath();
      ctx.moveTo(cx, el.y); ctx.lineTo(el.x + el.width, cy);
      ctx.lineTo(cx, el.y + el.height); ctx.lineTo(el.x, cy);
      ctx.closePath(); ctx.stroke(); fill(); break;
    }
    case "pentagon": {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const rx = el.width / 2, ry = el.height / 2;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 2 * Math.PI / 5) - Math.PI / 2;
        const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke(); fill(); break;
    }
    case "hexagon": {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const rx = el.width / 2, ry = el.height / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * 2 * Math.PI / 6);
        const px = cx + rx * Math.cos(a), py = cy + ry * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke(); fill(); break;
    }
    case "star": {
      const cx = el.x + el.width / 2, cy = el.y + el.height / 2;
      const rx = el.width / 2, ry = el.height / 2;
      const ratio = el.innerRatio != null ? el.innerRatio : 0.42;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 1 : ratio;
        const a = (i * Math.PI / 5) - Math.PI / 2;
        const px = cx + rx * r * Math.cos(a), py = cy + ry * r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke(); fill(); break;
    }
    case "resistor": drawResistor(ctx, el.x1, el.y1, el.x2, el.y2); break;
    case "capacitor": drawCapacitor(ctx, el.x1, el.y1, el.x2, el.y2); break;
    case "inductor": drawInductor(ctx, el.x1, el.y1, el.x2, el.y2); break;
    case "battery": drawBattery(ctx, el.x1, el.y1, el.x2, el.y2); break;
    case "diode": drawDiode(ctx, el.x1, el.y1, el.x2, el.y2); break;
    case "ground": drawGround(ctx, el.x, el.y); break;
    case "voltmeter": drawMeter(ctx, el.x, el.y, el.radius, "V"); break;
    case "ammeter": drawMeter(ctx, el.x, el.y, el.radius, "A"); break;
    case "connector":
      ctx.beginPath(); ctx.arc(el.x, el.y, el.radius, 0, 2 * Math.PI); ctx.stroke(); fill(); break;
    case "process": roundRect(ctx, el.x, el.y, el.width, el.height, 4); ctx.stroke(); fill(); break;
    case "terminator": roundRect(ctx, el.x, el.y, el.width, el.height, el.height / 2); ctx.stroke(); fill(); break;
    case "document":
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.x + el.width, el.y);
      ctx.lineTo(el.x + el.width, el.y + el.height);
      ctx.quadraticCurveTo(el.x + el.width / 2, el.y + el.height + 14, el.x, el.y + el.height);
      ctx.closePath(); ctx.stroke(); fill(); break;
    case "and-gate": drawAndGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "or-gate": drawOrGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "not-gate": drawNotGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "nand-gate": drawNandGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "nor-gate": drawNorGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "xor-gate": drawXorGate(ctx, el.x, el.y, el.width, el.height, el.fillColor); break;
    case "sine": drawSine(ctx, el.x1, el.y1, el.x2, el.y2, el.strokeColor, el.lineWidth); break;
    case "graph": drawGraphEl(ctx, el); break;
    default: break;
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawArrowhead(ctx, fromX, fromY, toX, toY, color) {
  const head = 14;
  const a = Math.atan2(toY - fromY, toX - fromX);
  ctx.save(); ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - head * Math.cos(a - Math.PI / 6), toY - head * Math.sin(a - Math.PI / 6));
  ctx.lineTo(toX - head * Math.cos(a + Math.PI / 6), toY - head * Math.sin(a + Math.PI / 6));
  ctx.closePath(); ctx.fillStyle = color || ctx.strokeStyle; ctx.fill();
  ctx.restore();
}

/* circuit primitives (preserved from original) */
function withOrientedSegment(x1, y1, x2, y2, fn) {
  const dx = x2 - x1, dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  return (ctx) => {
    ctx.save(); ctx.translate(x1, y1); ctx.rotate(angle);
    fn(ctx, distance); ctx.restore();
  };
}
function drawResistor(ctx, x1, y1, x2, y2) {
  withOrientedSegment(x1, y1, x2, y2, (c, d) => {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 0.25, 0);
    const seg = 6, sx = d * 0.25, ex = d * 0.75, step = (ex - sx) / seg, amp = 14;
    for (let i = 0; i < seg; i++) { c.lineTo(sx + step * i + step / 2, i % 2 === 0 ? -amp : amp); }
    c.lineTo(ex, 0); c.lineTo(d, 0); c.stroke();
  })(ctx);
}
function drawCapacitor(ctx, x1, y1, x2, y2) {
  withOrientedSegment(x1, y1, x2, y2, (c, d) => {
    const ph = 22, gap = 7, mid = d / 2;
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(mid - gap / 2, 0);
    c.moveTo(mid - gap / 2, -ph / 2); c.lineTo(mid - gap / 2, ph / 2);
    c.moveTo(mid + gap / 2, -ph / 2); c.lineTo(mid + gap / 2, ph / 2);
    c.moveTo(mid + gap / 2, 0); c.lineTo(d, 0); c.stroke();
  })(ctx);
}
function drawInductor(ctx, x1, y1, x2, y2) {
  withOrientedSegment(x1, y1, x2, y2, (c, d) => {
    const coils = 4, cw = (d * 0.5) / coils, sx = d * 0.25;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(sx, 0);
    for (let i = 0; i < coils; i++) { c.arc(sx + i * cw + cw / 2, 0, cw / 2, Math.PI, 0, false); }
    c.lineTo(d, 0); c.stroke();
  })(ctx);
}
function drawBattery(ctx, x1, y1, x2, y2) {
  withOrientedSegment(x1, y1, x2, y2, (c, d) => {
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(d * 0.4, 0);
    c.moveTo(d * 0.4, -14); c.lineTo(d * 0.4, 14);
    c.moveTo(d * 0.6, -8); c.lineTo(d * 0.6, 8);
    c.moveTo(d * 0.6, 0); c.lineTo(d, 0); c.stroke();
  })(ctx);
}
function drawDiode(ctx, x1, y1, x2, y2) {
  withOrientedSegment(x1, y1, x2, y2, (c, d) => {
    c.beginPath(); c.moveTo(0, 0); c.lineTo(d * 0.3, 0);
    c.moveTo(d * 0.3, -11); c.lineTo(d * 0.7, 0); c.lineTo(d * 0.3, 11); c.closePath(); c.stroke();
    c.beginPath(); c.moveTo(d * 0.7, -11); c.lineTo(d * 0.7, 11); c.stroke();
    c.beginPath(); c.moveTo(d * 0.7, 0); c.lineTo(d, 0); c.stroke();
  })(ctx);
}
function drawGround(ctx, x, y) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x, y + 18);
  ctx.moveTo(x - 14, y + 18); ctx.lineTo(x + 14, y + 18);
  ctx.moveTo(x - 10, y + 23); ctx.lineTo(x + 10, y + 23);
  ctx.moveTo(x - 5, y + 28); ctx.lineTo(x + 5, y + 28);
  ctx.stroke();
}
function drawMeter(ctx, cx, cy, r, label) {
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke();
  ctx.font = "bold 18px sans-serif"; ctx.fillStyle = ctx.strokeStyle;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, cx, cy);
}

/* logic gates (preserved) */
function drawAndGate(ctx, x, y, w, h, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y); ctx.lineTo(x + w * 0.5, y);
  ctx.arc(x + w * 0.5, y + h / 2, h / 2, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
  if (fill && fill !== "transparent") { ctx.fillStyle = fill; ctx.fill(); }
}
function drawOrGate(ctx, x, y, w, h, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + w * 0.6, y, x + w, y + h / 2);
  ctx.quadraticCurveTo(x + w * 0.6, y + h, x, y + h);
  ctx.quadraticCurveTo(x + w * 0.2, y + h / 2, x, y);
  ctx.stroke();
  if (fill && fill !== "transparent") { ctx.fillStyle = fill; ctx.fill(); }
}
function drawNotGate(ctx, x, y, w, h, fill) {
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.8, y + h / 2); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(x + w * 0.9, y + h / 2, w * 0.1, 0, 2 * Math.PI); ctx.stroke();
  if (fill && fill !== "transparent") { ctx.fillStyle = fill; ctx.fill(); }
}
function drawNandGate(ctx, x, y, w, h, fill) {
  drawAndGate(ctx, x, y, w * 0.85, h, fill);
  ctx.beginPath(); ctx.arc(x + w * 0.93, y + h / 2, w * 0.07, 0, 2 * Math.PI); ctx.stroke();
}
function drawNorGate(ctx, x, y, w, h, fill) {
  drawOrGate(ctx, x, y, w * 0.85, h, fill);
  ctx.beginPath(); ctx.arc(x + w * 0.93, y + h / 2, w * 0.07, 0, 2 * Math.PI); ctx.stroke();
}
function drawXorGate(ctx, x, y, w, h, fill) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.1, y);
  ctx.quadraticCurveTo(x + w * 0.1, y + h / 2, x - w * 0.1, y + h);
  ctx.stroke();
  drawOrGate(ctx, x, y, w, h, fill);
}

/* math plots (preserved, simplified) */
function drawSine(ctx, x1, y1, x2, y2, color, lw) {
  const w = x2 - x1, amp = Math.abs((y2 - y1) / 2) || 30;
  ctx.save();
  ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y1); ctx.stroke();
  ctx.setLineDash([]); ctx.strokeStyle = color; ctx.lineWidth = lw;
  ctx.beginPath();
  const steps = Math.abs(w);
  for (let i = 0; i <= steps; i += 2) {
    const cx = x1 + (w >= 0 ? i : -i);
    const cy = y1 - Math.sin((i / Math.max(1, Math.abs(w))) * Math.PI * 4) * amp;
    if (i === 0) ctx.moveTo(cx, cy); else ctx.lineTo(cx, cy);
  }
  ctx.stroke(); ctx.restore();
}
function drawGraphEl(ctx, el) {
  const { x, y, width, height, xMin, xMax, yMin, yMax, functions: fns, showGrid: g, xLabel, yLabel, title } = el;
  ctx.save();
  ctx.strokeStyle = "#334155"; ctx.lineWidth = 2; ctx.strokeRect(x, y, width, height);
  if (g) {
    ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5; ctx.setLineDash([2, 2]);
    for (let i = 0; i <= 10; i++) { const gx = x + (width * i) / 10; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + height); ctx.stroke(); const gy = y + (height * i) / 10; ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + width, gy); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];
  (fns || []).forEach((f, idx) => {
    ctx.strokeStyle = colors[idx % colors.length]; ctx.lineWidth = 2; ctx.beginPath();
    try {
      const fn = compileFn(f);
      let pen = false;
      for (let px = 0; px <= width; px++) {
        const xv = xMin + (px / width) * (xMax - xMin);
        const yv = fn(xv);
        const py = y + height - ((yv - yMin) / (yMax - yMin)) * height;
        if (py < y - 10 || py > y + height + 10) { pen = false; continue; }
        if (!pen) { ctx.moveTo(x + px, py); pen = true; } else ctx.lineTo(x + px, py);
      }
      ctx.stroke();
    } catch {}
  });
  ctx.fillStyle = "#1e293b"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
  if (xLabel) ctx.fillText(xLabel, x + width / 2, y + height + 18);
  if (title) { ctx.font = "bold 14px sans-serif"; ctx.fillText(title, x + width / 2, y - 8); }
  ctx.restore();
}


/* =========================================================================
 * PROPERTIES PANEL (right side, contextual on selection)
 * ========================================================================= */
function PropertiesPanel({ el, update, commit, onDuplicate, onDelete }) {
  const isLine = ["line", "arrow", "resistor", "capacitor", "inductor", "battery", "diode"].includes(el.type);
  const isBox = ["rect", "rounded-rect", "parallelogram", "process", "terminator", "document", "and-gate", "or-gate", "not-gate", "nand-gate", "nor-gate", "xor-gate"].includes(el.type);
  const isCircle = ["circle", "voltmeter", "ammeter", "connector"].includes(el.type);
  const isPoly = ["rhombus", "pentagon", "hexagon", "star", "triangle", "decision"].includes(el.type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">{el.type}</span>
        <span className="text-[10px] font-mono text-slate-400">{el.id}</span>
      </div>

      {/* Position / size */}
      <section>
        <h4 className="prop-label !mb-2">Geometry</h4>
        <div className="grid grid-cols-2 gap-2">
          {(isBox || isPoly || el.type === "text" || el.type === "graph" || el.type === "ellipse") && el.x !== undefined && (
            <Field label="X" type="number" value={Math.round(el.x)} onChange={(v) => update("x", v)} onBlur={commit} />
          )}
          {(isBox || isPoly || el.type === "text" || el.type === "graph" || el.type === "ellipse") && el.y !== undefined && (
            <Field label="Y" type="number" value={Math.round(el.y)} onChange={(v) => update("y", v)} onBlur={commit} />
          )}
          {(isCircle || isPoly) && el.radius !== undefined && (
            <Field label="Radius" type="number" value={Math.round(el.radius)} onChange={(v) => update("radius", v)} onBlur={commit} />
          )}
          {el.type === "ellipse" && el.rx !== undefined && (
            <Field label="RX" type="number" value={Math.round(el.rx)} onChange={(v) => update("rx", v)} onBlur={commit} />
          )}
          {el.type === "ellipse" && el.ry !== undefined && (
            <Field label="RY" type="number" value={Math.round(el.ry)} onChange={(v) => update("ry", v)} onBlur={commit} />
          )}
          {el.type === "star" && el.innerRadius !== undefined && (
            <Field label="Inner R" type="number" value={Math.round(el.innerRadius)} onChange={(v) => update("innerRadius", v)} onBlur={commit} />
          )}
          {(isBox || isPoly || el.type === "graph") && el.width !== undefined && (
            <Field label="Width" type="number" value={Math.round(el.width)} onChange={(v) => update("width", v)} onBlur={commit} />
          )}
          {(isBox || isPoly || el.type === "graph") && el.height !== undefined && (
            <Field label="Height" type="number" value={Math.round(el.height)} onChange={(v) => update("height", v)} onBlur={commit} />
          )}
          {el.type === "rounded-rect" && (
            <Field label="Corner" type="number" value={Math.round(el.cornerRadius || 0)} onChange={(v) => update("cornerRadius", v)} onBlur={commit} />
          )}
          {isLine && el.x1 !== undefined && (
            <>
              <Field label="X1" type="number" value={Math.round(el.x1)} onChange={(v) => update("x1", v)} onBlur={commit} />
              <Field label="Y1" type="number" value={Math.round(el.y1)} onChange={(v) => update("y1", v)} onBlur={commit} />
              <Field label="X2" type="number" value={Math.round(el.x2)} onChange={(v) => update("x2", v)} onBlur={commit} />
              <Field label="Y2" type="number" value={Math.round(el.y2)} onChange={(v) => update("y2", v)} onBlur={commit} />
            </>
          )}
        </div>
        {/* Rotation */}
        <div className="mt-3">
          <label className="prop-label">Rotation: {Math.round(el.rotation || 0)}°</label>
          <input
            type="range" min="-180" max="180" value={el.rotation || 0}
            onChange={(e) => update("rotation", +e.target.value)}
            onMouseUp={commit} onTouchEnd={commit}
            className="w-full"
          />
          <div className="flex gap-1 mt-1">
            <button onClick={() => { update("rotation", 0); commit(); }} className="ribbon-btn !text-[10px] !py-0.5">0°</button>
            <button onClick={() => { update("rotation", 90); commit(); }} className="ribbon-btn !text-[10px] !py-0.5">90°</button>
            <button onClick={() => { update("rotation", 180); commit(); }} className="ribbon-btn !text-[10px] !py-0.5">180°</button>
            <button onClick={() => { update("rotation", -90); commit(); }} className="ribbon-btn !text-[10px] !py-0.5">-90°</button>
          </div>
        </div>
      </section>

      {/* Text */}
      {el.type === "text" && (
        <section>
          <h4 className="prop-label !mb-2">Text</h4>
          <div className="space-y-2">
            <Field label="Content" type="text" value={el.text || ""} onChange={(v) => update("text", v)} onBlur={commit} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Font size" type="number" value={el.fontSize || 18} onChange={(v) => update("fontSize", v)} onBlur={commit} />
              <div>
                <label className="prop-label">Font</label>
                <select value={el.fontFamily || "sans-serif"} onChange={(e) => update("fontFamily", e.target.value)} onBlur={commit} className="prop-input">
                  <option value="sans-serif">Sans</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Mono</option>
                  <option value="cursive">Cursive</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times</option>
                  <option value="Courier New">Courier</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-[12px] cursor-pointer">
              <input type="checkbox" checked={el.isLatex || false} onChange={(e) => { update("isLatex", e.target.checked); commit(); }} />
              LaTeX formula
            </label>
          </div>
        </section>
      )}

      {/* Style */}
      <section>
        <h4 className="prop-label !mb-2">Appearance</h4>
        <div className="space-y-2.5">
          <div>
            <label className="prop-label">Stroke</label>
            <div className="flex items-center gap-2">
              <input type="color" value={el.strokeColor || "#000000"} onChange={(e) => update("strokeColor", e.target.value)} onBlur={commit} className="w-9 h-7 rounded border border-[var(--border-2)] cursor-pointer" />
              <span className="text-[11px] font-mono text-slate-500">{(el.strokeColor || "#000000").toUpperCase()}</span>
            </div>
          </div>
          {(isBox || isCircle || isPoly || el.type === "ellipse") && (
            <div>
              <label className="prop-label">Fill</label>
              <div className="flex items-center gap-2">
                <input type="color" value={el.fillColor === "transparent" ? "#ffffff" : el.fillColor} onChange={(e) => update("fillColor", e.target.value)} onBlur={commit} className="w-9 h-7 rounded border border-[var(--border-2)] cursor-pointer" />
                <button onClick={() => { update("fillColor", "transparent"); commit(); }} className={cx("text-[11px] px-2 py-0.5 rounded", el.fillColor === "transparent" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700")}>None</button>
              </div>
              {el.fillColor && el.fillColor !== "transparent" && (
                <div className="mt-1.5">
                  <label className="prop-label">Opacity: {Math.round((el.fillOpacity != null ? el.fillOpacity : 1) * 100)}%</label>
                  <input type="range" min="0" max="100" value={Math.round((el.fillOpacity != null ? el.fillOpacity : 1) * 100)} onChange={(e) => update("fillOpacity", +e.target.value / 100)} onMouseUp={commit} className="w-full" />
                </div>
              )}
            </div>
          )}
          {el.lineWidth !== undefined && (
            <div>
              <label className="prop-label">Line width: {el.lineWidth}px</label>
              <input type="range" min="1" max="20" value={el.lineWidth} onChange={(e) => update("lineWidth", +e.target.value)} onMouseUp={commit} className="w-full" />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            {el.isDashed !== undefined && (
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={el.isDashed || false} onChange={(e) => { update("isDashed", e.target.checked); commit(); }} /> Dashed line
              </label>
            )}
            {(el.hasArrow !== undefined || isLine) && (
              <label className="flex items-center gap-2 text-[12px] cursor-pointer">
                <input type="checkbox" checked={el.hasArrow || el.type === "arrow" || false} onChange={(e) => { update("hasArrow", e.target.checked); commit(); }} disabled={el.type === "arrow"} /> Arrow head
              </label>
            )}
          </div>
        </div>
      </section>

      <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
        <button onClick={onDuplicate} className="flex-1 py-1.5 text-[12px] font-semibold rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">📋 Duplicate</button>
        <button onClick={onDelete} className="flex-1 py-1.5 text-[12px] font-semibold rounded border border-red-200 bg-red-50 text-red-700 hover:bg-red-100">🗑️ Delete</button>
      </div>
    </div>
  );
}

function Field({ label, type, value, onChange, onBlur }) {
  return (
    <div>
      <label className="prop-label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        onBlur={onBlur}
        className="prop-input"
      />
    </div>
  );
}

function EmptyProps({ onOpenOutput, hasCode }) {
  return (
    <div className="text-center text-slate-400 text-[12px] py-6 space-y-3">
      <div className="text-3xl">⬚</div>
      <p className="font-medium text-slate-500">No selection</p>
      <p>Click an element on the canvas to edit its properties. Click a shape in the left library, then click the canvas to place it.</p>
      {hasCode && (
        <button onClick={onOpenOutput} className="ribbon-btn !text-blue-600 mx-auto">↑ Open Code & Preview</button>
      )}
    </div>
  );
}

/* =========================================================================
 * GRAPHING MODE (Desmos-style)
 * ========================================================================= */
/* Min/max pair for an axis. Typing is unconstrained so intermediate values like "-"
 * or a momentarily inverted range are allowed; the range is normalised on blur.
 * (renderGraph and the code generator both run everything through safeRange too,
 * so a half-typed value can never divide by zero or emit xmin=xmax.) */
function AxisRange({ range, setRange, fallback }) {
  const commit = () => setRange(safeRange(range, fallback));
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={range[0]}
        onChange={(e) => setRange([e.target.value === "" ? "" : +e.target.value, range[1]])}
        onBlur={commit}
        className="prop-input"
      />
      <span className="text-slate-400 text-xs">to</span>
      <input
        type="number"
        value={range[1]}
        onChange={(e) => setRange([range[0], e.target.value === "" ? "" : +e.target.value])}
        onBlur={commit}
        className="prop-input"
      />
    </div>
  );
}

function GraphingMode({ functions, compiledFns, xRange, yRange, graphConfig, setGraphConfig, graphCanvasRef, graphContainerRef, onMove, onLeave, addFunction, updateFunction, removeFunction, setXRange, setYRange, error }) {
  const setCfg = (patch) => setGraphConfig({ ...graphConfig, ...patch });
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* function list sidebar */}
      <aside className="tm-right" style={{ width: 260 }}>
        <div className="tm-right-head">
          <span>Functions</span>
          <button onClick={addFunction} className="tm-tool !w-6 !h-6" title="Add function"><Icon name="plus" /></button>
        </div>
        <div className="tm-right-body !p-2 space-y-2">
          {functions.map((f) => {
            const compiled = compiledFns.find((c) => c.id === f.id);
            return (
              <div key={f.id} className="border border-[var(--border)] rounded-md p-2 space-y-1.5 bg-[var(--panel)]">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={f.visible} onChange={(e) => updateFunction(f.id, { visible: e.target.checked })} title="Toggle visibility" />
                  <input
                    type="color"
                    value={f.color}
                    onChange={(e) => updateFunction(f.id, { color: e.target.value })}
                    className="w-5 h-5 rounded border border-[var(--border-2)] cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-400 flex-1">y =</span>
                  <button onClick={() => removeFunction(f.id)} className="text-slate-400 hover:text-red-600 text-[14px] px-1">✕</button>
                </div>
                <input
                  type="text"
                  value={f.expr}
                  onChange={(e) => updateFunction(f.id, { expr: e.target.value })}
                  placeholder="e.g. sin(x) + 2"
                  className="prop-input !font-mono"
                />
                {compiled?.error && (
                  <p className="text-[10px] text-red-600">⚠ {compiled.error}</p>
                )}
              </div>
            );
          })}
          {functions.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-6">No functions yet.<br />Click &ldquo;+ Add&rdquo; to plot one.</p>
          )}
        </div>

        {/* axis range controls */}
        <div className="border-t border-[var(--border)] p-3 space-y-2">
          <h4 className="prop-label">X axis</h4>
          <AxisRange range={xRange} setRange={setXRange} fallback={[-10, 10]} />
          <h4 className="prop-label">Y axis</h4>
          <AxisRange range={yRange} setRange={setYRange} fallback={[-6, 6]} />
          <p className="text-[10px] text-slate-400 leading-relaxed pt-1">
            Functions support: <code>sin cos tan sqrt abs exp ln log</code>, constants <code>pi e</code>, operators <code>+ − * / ^</code>, and implicit multiplication (<code>2x</code>).
          </p>
        </div>

        {/* chart customization */}
        <div className="border-t border-[var(--border)] p-3 space-y-2 overflow-y-auto">
          <h4 className="prop-label">Chart Options</h4>
          <Field label="Title" type="text" value={graphConfig.title} onChange={(v) => setCfg({ title: v })} />
          <div className="grid grid-cols-2 gap-2">
            <Field label="X label" type="text" value={graphConfig.xLabel} onChange={(v) => setCfg({ xLabel: v })} />
            <Field label="Y label" type="text" value={graphConfig.yLabel} onChange={(v) => setCfg({ yLabel: v })} />
          </div>
          <div>
            <label className="prop-label">Grid style</label>
            <select value={graphConfig.gridStyle} onChange={(e) => setCfg({ gridStyle: e.target.value })} className="prop-input">
              <option value="both">Major + Minor</option>
              <option value="major">Major only</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input type="checkbox" checked={graphConfig.showMajorTicks} onChange={(e) => setCfg({ showMajorTicks: e.target.checked })} /> Major ticks
            </label>
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input type="checkbox" checked={graphConfig.showMinorTicks} onChange={(e) => setCfg({ showMinorTicks: e.target.checked })} /> Minor ticks
            </label>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input type="checkbox" checked={graphConfig.showLegend} onChange={(e) => setCfg({ showLegend: e.target.checked })} /> Legend
            </label>
            <label className="flex items-center gap-1.5 text-[12px] cursor-pointer">
              <input type="checkbox" checked={graphConfig.showDataLabels} onChange={(e) => setCfg({ showDataLabels: e.target.checked })} /> Data labels
            </label>
          </div>
          {graphConfig.showLegend && (
            <div>
              <label className="prop-label">Legend position</label>
              <select value={graphConfig.legendPosition} onChange={(e) => setCfg({ legendPosition: e.target.value })} className="prop-input">
                <option value="north east">Top right</option>
                <option value="north west">Top left</option>
                <option value="south east">Bottom right</option>
                <option value="south west">Bottom left</option>
              </select>
            </div>
          )}
        </div>
      </aside>

      {/* plot canvas */}
      <div className="flex-1 p-3 flex flex-col">
        <div className="flex items-center gap-2 mb-2 text-[11px] text-slate-500">
          <span className="font-semibold">Graphing</span>
          <span className="text-slate-400">· hover the plot to inspect values · output uses pgfplots</span>
        </div>
        <div ref={graphContainerRef} className="flex-1 rounded-lg border border-[var(--border)] bg-white overflow-hidden">
          <canvas ref={graphCanvasRef} onMouseMove={onMove} onMouseLeave={onLeave} className="w-full h-full" />
        </div>
        {error && (
          <div className="mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">{error}</div>
        )}
      </div>
    </div>
  );
}

/* Preview rendered by TikZJax as an SVG string. "fit" auto-scales to the
   container. The SVG is the app's own compiled TikZ output (paths + text),
   never arbitrary HTML, so it is safe to inject via dangerouslySetInnerHTML. */
function PreviewSvg({ svg, zoom, wrapRef }) {
  const [wrapSize, setWrapSize] = useState({ w: 0, h: 0 });

  const natural = useMemo(() => {
    const m = svg.match(/\bviewBox=["']([^"']+)["']/);
    let w = 0, h = 0;
    if (m) {
      const parts = m[1].trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4) { w = parts[2]; h = parts[3]; }
    }
    if (!w || !h) {
      const wm = svg.match(/\bwidth=["']?([\d.]+)pt["']?/);
      const hm = svg.match(/\bheight=["']?([\d.]+)pt["']?/);
      w = wm ? parseFloat(wm[1]) : 0;
      h = hm ? parseFloat(hm[1]) : 0;
    }
    return { w, h };
  }, [svg]);

  useEffect(() => {
    const measure = () => {
      const w = wrapRef?.current;
      if (w) setWrapSize({ w: w.clientWidth, h: w.clientHeight });
    };
    measure();
    const t = setTimeout(measure, 100);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [wrapRef]);

  const actualZoom = useMemo(() => {
    if (zoom !== "fit") return zoom;
    if (!wrapSize.w || !natural.w) return 0.5;
    const pad = 32;
    return Math.min((wrapSize.w - pad) / natural.w, (wrapSize.h - pad) / natural.h, 1);
  }, [zoom, natural, wrapSize]);

  return (
    <div
      style={{
        transform: `scale(${actualZoom})`,
        transformOrigin: "center center",
        width: natural.w || "auto",
        height: natural.h || "auto",
        maxWidth: "none",
        maxHeight: "none",
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
