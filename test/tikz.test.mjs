import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTikzLocal,
  hexToRgb,
  rgbTex,
  texEscape,
  tikzFlipOrigin,
} from '../lib/tikz.js';

const rect = (over = {}) => ({
  type: 'rect', x: 100, y: 100, width: 100, height: 50,
  strokeColor: '#000000', lineWidth: 2, ...over,
});

const emit = (elements, over = {}) =>
  generateTikzLocal({ mode: 'diagram', elements, canvasHeight: 400, ...over }).code;

test('output is a tikzpicture and nothing more', () => {
  const code = emit([rect()]);
  assert.match(code, /\\begin\{tikzpicture\}/);
  assert.match(code, /\\end\{tikzpicture\}/);
  // \usepackage cannot appear inside \begin{document}; requirements are noted
  // as a comment for the caller's preamble instead.
  assert.doesNotMatch(code, /\\usepackage/);
  assert.doesNotMatch(code, /\\documentclass/);
});

test('an empty diagram still emits valid, compilable TikZ', () => {
  const code = emit([]);
  assert.match(code, /\\begin\{tikzpicture\}[\s\S]*\\end\{tikzpicture\}/);
});

test('the y axis is flipped, because canvas y grows downward and TikZ y grows up', () => {
  const high = emit([rect({ y: 50 })]);
  const low = emit([rect({ y: 300 })]);
  assert.notEqual(high, low);
});

test('the flip origin comes from the content, not the window', () => {
  // The same diagram must emit the same coordinates whatever size the canvas
  // happens to be, or a resize would silently change the exported document.
  const elements = [rect()];
  assert.equal(emit(elements, { canvasHeight: 400 }), emit(elements, { canvasHeight: 1200 }));
});

test('the flip origin snaps to the grid so a sub-pixel drag changes nothing', () => {
  assert.equal(tikzFlipOrigin([rect({ y: 100 })], 800) % 20, 0);
  assert.equal(tikzFlipOrigin([rect({ y: 100.4 })], 800), tikzFlipOrigin([rect({ y: 100 })], 800));
});

test('an empty element list falls back rather than returning -Infinity', () => {
  assert.equal(tikzFlipOrigin([], 640), 640);
  assert.equal(tikzFlipOrigin(undefined, 640), 640);
});

test('a malformed element does not take the whole diagram down', () => {
  const code = emit([rect(), { type: 'rect' }, rect({ x: 300 })]);
  assert.match(code, /\\end\{tikzpicture\}/);
});

test('LaTeX metacharacters in a label are escaped, not compiled', () => {
  // Unescaped, any one of these is a hard compilation error in the student's
  // document, reported at a line number that means nothing to them.
  assert.equal(texEscape('50% & rising'), '50\\% \\& rising');
  assert.equal(texEscape('a_b^c'), 'a\\_b\\textasciicircum{}c');
  assert.equal(texEscape('#1 $x$ {y}'), '\\#1 \\$x\\$ \\{y\\}');
  assert.equal(texEscape('back\\slash'), 'back\\textbackslash{}slash');
});

test('escaping is safe on empty and missing values', () => {
  assert.equal(texEscape(''), '');
  assert.equal(texEscape(null), '');
  assert.equal(texEscape(undefined), '');
});

test('a text label reaches the output escaped', () => {
  const code = emit([{ type: 'text', x: 20, y: 40, text: '100% sure', fontSize: 16, strokeColor: '#000000' }]);
  assert.match(code, /100\\%/);
});

test('colours emit as a TikZ rgb colour with an explicit denominator', () => {
  assert.deepEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 });
  // `{rgb,255:red,255;green,0;blue,0}` -- the 255-denominator form, so the
  // byte values go in unscaled and no rounding is introduced.
  assert.equal(rgbTex('#ff0000'), '{rgb,255:red,255;green,0;blue,0}');
  assert.equal(rgbTex('#3355ff'), '{rgb,255:red,51;green,85;blue,255}');
});

test('a short hex colour is understood', () => {
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
});

test('circuit elements declare their package requirement', () => {
  const { code, reqs } = generateTikzLocal({
    mode: 'diagram', canvasHeight: 400,
    elements: [{ type: 'resistor', x1: 50, y1: 50, x2: 150, y2: 50, strokeColor: '#000000', lineWidth: 2 }],
  });
  assert.ok(reqs.includes('circuitikz'), `got ${JSON.stringify(reqs)}`);
  // The editor reads this comment to decide whether it can preview at all.
  assert.match(code, /^%\s*Requires:.*circuitikz/m);
});

test('a plain diagram requires nothing and says so by omission', () => {
  const { code, reqs } = generateTikzLocal({
    mode: 'diagram', canvasHeight: 400, elements: [rect()],
  });
  assert.deepEqual(reqs, []);
  assert.doesNotMatch(code, /^%\s*Requires:/m);
});

test('the same input always emits the same output', () => {
  const elements = [rect(), { type: 'circle', x: 200, y: 200, radius: 30, strokeColor: '#3355ff', lineWidth: 1 }];
  assert.equal(emit(elements), emit(elements));
});

test('a project name cannot break out of the header comment', () => {
  // A .tikz.json file carries the project name. It went into the `%` header
  // verbatim, so a newline ended the comment and everything after it became
  // live TikZ in code the user copies out and compiles -- a shared project
  // file could carry \immediate\write18{...} into someone else's LaTeX run.
  const { code } = generateTikzLocal({
    mode: 'diagram', canvasHeight: 400, elements: [rect()],
    projectName: 'Innocent\n\\immediate\\write18{echo pwned}\n% ',
  });
  const header = code.split('\n').find((l) => l.startsWith('%'));
  assert.ok(header.includes('write18'), 'the text may survive');
  // ...but only inside the comment. Nothing may escape onto its own line.
  for (const line of code.split('\n')) {
    if (line.startsWith('%')) continue;
    assert.doesNotMatch(line, /write18/, `escaped onto: ${line}`);
  }
});

test('every separator a comment could end on is neutralised', () => {
  for (const sep of ['\n', '\r', '\r\n', ' ', ' ']) {
    const { code } = generateTikzLocal({
      mode: 'diagram', canvasHeight: 400, elements: [rect()],
      projectName: `A${sep}\\write18{x}`,
    });
    assert.equal(code.split('\n').filter((l) => l.includes('write18') && !l.startsWith('%')).length, 0);
  }
});

test('an absurdly long project name cannot be smuggled through the header', () => {
  const { code } = generateTikzLocal({
    mode: 'diagram', canvasHeight: 400, elements: [rect()],
    projectName: 'x'.repeat(100000),
  });
  assert.ok(code.split('\n')[0].length < 300);
});

test('a graph exports through safeRange without a missing helper', () => {
  // lib/tikz.js reaches for safeRange in graph mode. It lived in page.js, so
  // extracting the emitter left graph export throwing ReferenceError at the
  // first line of the axis -- with no test, silently.
  const { code } = generateTikzLocal({
    mode: 'graph', canvasHeight: 400, elements: [], xRange: [-5, 5], yRange: [-5, 5],
    graphConfig: {}, functions: [{ id: 'a', expr: 'sin(x)', color: '#2563eb', visible: true }],
  });
  assert.match(code, /\\begin\{axis\}/);
  assert.match(code, /\\addplot/);
});

test('a broken function expression cannot break out of its skip comment', () => {
  // The error path for an unparseable expression escaped for LaTeX but not for
  // newlines -- and an expression containing one lands in exactly this path,
  // because the tokenizer rejects it.
  const { code } = generateTikzLocal({
    mode: 'graph', canvasHeight: 400, elements: [], xRange: [-5, 5], yRange: [-5, 5],
    graphConfig: {},
    functions: [{ id: 'a', expr: 'x\n\\immediate\\write18{echo pwned}\n%', color: '#2563eb', visible: true }],
  });
  for (const line of code.split('\n')) {
    if (line.trim().startsWith('%')) continue;
    assert.doesNotMatch(line, /write18/, `escaped onto: ${line}`);
  }
});

test('a bad range does not produce an invalid axis', () => {
  const { code } = generateTikzLocal({
    mode: 'graph', canvasHeight: 400, elements: [], xRange: [5, 5], yRange: [NaN, 'x'],
    graphConfig: {}, functions: [],
  });
  assert.doesNotMatch(code, /NaN|undefined/);
});
