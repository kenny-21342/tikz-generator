import test from 'node:test';
import assert from 'node:assert/strict';
import { compileFn, parseExpr, toPgfExpr, tokenizeExpr } from '../lib/expr.js';

const at = (expr, x) => compileFn(expr)(x);

test('arithmetic respects precedence', () => {
  assert.equal(at('2 + 3 * 4', 0), 14);
  assert.equal(at('(2 + 3) * 4', 0), 20);
});

test('exponentiation is right-associative, as in maths', () => {
  // 2^(3^2) = 512, not (2^3)^2 = 64.
  assert.equal(at('2^3^2', 0), 512);
});

test('unary minus binds tighter than addition but looser than a power', () => {
  assert.equal(at('-3 + 5', 0), 2);
  assert.equal(at('-2^2', 0), -4);
});

test('implicit multiplication works the way a student writes it', () => {
  assert.equal(at('2x', 3), 6);
  assert.equal(at('3sin(0)', 0), 0);
  assert.equal(at('2(x+1)', 4), 10);
});

test('functions and constants resolve', () => {
  assert.equal(at('sin(0)', 0), 0);
  assert.equal(Math.round(at('cos(pi)', 0)), -1);
  assert.equal(at('sqrt(16)', 0), 4);
  assert.ok(Math.abs(at('ln(e)', 0) - 1) < 1e-12);
});

test('x is the variable and is substituted per call', () => {
  const f = compileFn('x^2 + 1');
  assert.equal(f(0), 1);
  assert.equal(f(3), 10);
  assert.equal(f(-3), 10);
});

test('a malformed expression is rejected, not silently evaluated', () => {
  for (const bad of ['2 +', '(1 + 2', '*3']) {
    assert.throws(() => compileFn(bad), undefined, `accepted ${bad}`);
  }
});

test('an unknown identifier is rejected rather than read as a global', () => {
  // The expression comes from a text box, so this is the security-relevant case.
  assert.throws(() => compileFn('process'));
  assert.throws(() => compileFn('globalThis'));
  assert.throws(() => compileFn('constructor'));
});

test('division by zero yields a non-finite value rather than throwing', () => {
  // The grapher plots point by point and skips non-finite ones; a throw here
  // would take the whole curve down with it.
  assert.equal(Number.isFinite(at('1/x', 0)), false);
});

test('the tokenizer keeps numbers whole', () => {
  const values = tokenizeExpr('12.5 + 3').map((t) => t.v);
  assert.ok(values.includes(12.5), `got ${JSON.stringify(values)}`);
});

test('parseExpr returns something compileFn can use', () => {
  assert.notEqual(parseExpr('x+1'), undefined);
});

test('pgfmath conversion emits pgf syntax, never JavaScript', () => {
  const out = toPgfExpr('2 + 3 * x');
  assert.match(out, /x/);
  assert.doesNotMatch(out, /Math\./);
});
