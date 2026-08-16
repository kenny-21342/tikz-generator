import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_BODY_BYTES,
  MAX_ELEMENTS,
  MAX_FUNCTIONS,
  MAX_TIKZ_LENGTH,
  bodyExceedsLimit,
  validateGenerateBody,
  validateRenderCode,
} from '../lib/routeGuards.js';

test('body size uses UTF-8 bytes, not JavaScript code units', () => {
  assert.equal(bodyExceedsLimit('a'.repeat(MAX_BODY_BYTES)), false);
  assert.equal(bodyExceedsLimit('a'.repeat(MAX_BODY_BYTES - 1) + 'é'), true);
});

test('diagram input accepts elements and rejects malformed or excessive collections', () => {
  assert.deepEqual(validateGenerateBody({ elements: [] }), { ok: true, isGraph: false });
  assert.equal(validateGenerateBody({ elements: 'not-an-array' }).status, 400);
  assert.equal(validateGenerateBody({ elements: Array(MAX_ELEMENTS + 1).fill({}) }).status, 413);
});

test('graph input requires finite ranges and bounded expressions', () => {
  const valid = {
    mode: 'graph',
    functions: [{ expr: 'sin(x)', color: '#000' }],
    xRange: [-5, 5],
    yRange: [-2, 2],
  };
  assert.deepEqual(validateGenerateBody(valid), { ok: true, isGraph: true });
  assert.equal(validateGenerateBody({ ...valid, xRange: [0, Infinity] }).status, 400);
  assert.equal(
    validateGenerateBody({ ...valid, functions: Array(MAX_FUNCTIONS + 1).fill(valid.functions[0]) }).status,
    413,
  );
});

test('image input only accepts bounded image data URLs', () => {
  assert.equal(validateGenerateBody({ image: 'https://example.com/a.png' }).status, 400);
  assert.deepEqual(
    validateGenerateBody({ image: 'data:image/png;base64,AAAA' }),
    { ok: true, isGraph: false },
  );
});

test('preview input rejects TeX file access, shell escapes, and preambles', () => {
  assert.deepEqual(validateRenderCode('\\begin{tikzpicture}\\end{tikzpicture}'), { ok: true });
  for (const source of [
    '\\input{/etc/passwd}',
    '\\write18{whoami}',
    '\\usepackage{shellesc}',
    '\\documentclass{article}',
  ]) {
    const result = validateRenderCode(source);
    assert.equal(result.ok, false, source);
    assert.equal(result.status, 400, source);
  }
});

test('preview input enforces its source cap', () => {
  assert.equal(validateRenderCode('x'.repeat(MAX_TIKZ_LENGTH + 1)).status, 413);
});
