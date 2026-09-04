/**
 * Safe expression parser: tokenizer, shunting-yard, RPN evaluation.
 *
 * Lifted out of app/page.js so it can be tested. It was 250 lines of parser
 * inside a 3,865-line client component, which meant the one part of the app
 * with a right and a wrong answer for every input was the part nothing could
 * exercise. Nothing here touches the DOM or React.
 *
 * `eval()` is deliberately not used: the expression comes from a text box.
 */
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

/**
 * A problem with the expression itself, as opposed to a value it cannot take.
 *
 * The distinction is the whole point: `1/x` at x=0 is a fine expression with a
 * gap in it, and the grapher should skip the point and carry on. `2x +` is not
 * an expression at all, and the student needs to be told. Both used to arrive
 * as NaN and the editor showed nothing for either, so a typo looked exactly
 * like a curve that had not been drawn yet.
 */
class ExprError extends Error {}

function evalRPN(rpn, x) {
  const st = [];
  for (const tk of rpn) {
    if (tk.t === "num") { st.push(tk.v); continue; }
    if (tk.t === "name") {
      if (tk.v === "x") { st.push(x); continue; }
      if (MATH_CONSTS[tk.v] !== undefined) { st.push(MATH_CONSTS[tk.v]); continue; }
      throw new ExprError(`Unknown identifier '${tk.v}'`);
    }
    if (tk.t === "op") {
      if (tk.v === "f") {
        const a = st.pop();
        if (a === undefined) throw new ExprError("Invalid expression");
        // An unrecognised name would otherwise be a TypeError from calling
        // undefined, which reaches the student as a stack trace.
        if (typeof MATH_FUNCS[tk.fn] !== "function") {
          throw new ExprError(`Unknown function '${tk.fn}'`);
        }
        st.push(MATH_FUNCS[tk.fn](a));
        continue;
      }
      if (tk.v === "u") {
        const a = st.pop();
        if (a === undefined) throw new ExprError("Invalid expression");
        st.push(-a);
        continue;
      }
      const b = st.pop();
      const a = st.pop();
      if (a === undefined || b === undefined) throw new ExprError("Invalid expression");
      if (tk.v === "^") st.push(Math.pow(a, b));
      else if (tk.v === "+") st.push(a + b);
      else if (tk.v === "-") st.push(a - b);
      else if (tk.v === "*") st.push(a * b);
      else if (tk.v === "/") st.push(a / b);
      else throw new ExprError(`Unknown operator '${tk.v}'`);
    }
  }
  if (st.length !== 1 || typeof st[0] !== "number") throw new ExprError("Invalid expression");
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

  // Evaluate once here so a broken expression fails at compile time, where the
  // editor is watching, instead of returning NaN at every point and drawing
  // nothing. Every structural error is independent of x, so one probe settles
  // it; a value error at this particular x is not structural and is ignored.
  try {
    evalRPN(rpn, 1);
  } catch (error) {
    if (error instanceof ExprError) throw error;
  }

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

export {
  ExprError,
  MATH_CONSTS,
  MATH_FUNCS,
  compileFn,
  evalRPN,
  parseExpr,
  toPgfExpr,
  toRPN,
  tokenizeExpr,
};
