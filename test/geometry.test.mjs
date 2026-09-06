import assert from "node:assert/strict";
import test from "node:test";

import {
  BOX_KINDS,
  CIRC_KINDS,
  DEFAULT_GEOMETRY,
  LINE_KINDS,
  elementCenter,
  getElementBounds,
  isPointInElement,
} from "../lib/geometry.js";

/**
 * Hit testing and bounds.
 *
 * This is the code a user feels rather than reads: if it is wrong, clicks land
 * on the wrong shape or on nothing, and there is no error to go looking for.
 * It lived in app/page.js — 3,189 lines, no tests — until it was moved here.
 */

const rect = (over = {}) => ({ type: "rect", x: 100, y: 100, width: 80, height: 40, ...over });

test("a point inside a box hits it, and one outside does not", () => {
  const el = rect();
  assert.equal(isPointInElement(140, 120, el), true, "centre");
  assert.equal(isPointInElement(100, 100, el), true, "top-left corner");
  assert.equal(isPointInElement(180, 140, el), true, "bottom-right corner");
  assert.equal(isPointInElement(300, 120, el), false, "well clear to the right");
  assert.equal(isPointInElement(140, 300, el), false, "well clear below");
});

test("tolerance widens the grab area by exactly its own amount", () => {
  const el = rect();
  // 5 px left of the edge: caught at tol 6, missed at tol 4.
  assert.equal(isPointInElement(95, 120, el, 6), true);
  assert.equal(isPointInElement(95, 120, el, 4), false);
  // The boundary itself is inclusive.
  assert.equal(isPointInElement(94, 120, el, 6), true);
  assert.equal(isPointInElement(93.9, 120, el, 6), false);
});

test("zoom-scaled tolerance keeps the grab area constant on screen", () => {
  // The editor passes tol = 6 / zoom so the grab area is 6 screen pixels at any
  // magnification. At 3x zoom that is 2 canvas units.
  const el = rect();
  assert.equal(isPointInElement(98, 120, el, 6 / 3), true, "2 units out, caught");
  assert.equal(isPointInElement(97, 120, el, 6 / 3), false, "3 units out, missed");
});

test("a circle is round, not square", () => {
  const el = { type: "circle", x: 200, y: 200, radius: 50 };
  assert.equal(isPointInElement(200, 200, el), true, "centre");
  assert.equal(isPointInElement(249, 200, el), true, "just inside the rim");
  // The corner of the bounding box is sqrt(2)*50 = 70.7 away — outside.
  assert.equal(isPointInElement(250, 250, el), false, "bounding-box corner is a miss");
});

test("an ellipse is elliptical, not a circle on its major axis", () => {
  const el = { type: "ellipse", x: 200, y: 200, rx: 100, ry: 20 };
  assert.equal(isPointInElement(290, 200, el), true, "along the major axis");
  assert.equal(isPointInElement(200, 215, el), true, "along the minor axis");
  assert.equal(isPointInElement(200, 260, el), false, "past the minor axis");
});

test("a line is hit near its length, not across its bounding box", () => {
  const el = { type: "line", x1: 0, y1: 0, x2: 200, y2: 200, lineWidth: 2 };
  assert.equal(isPointInElement(100, 100, el), true, "on the line");
  assert.equal(isPointInElement(103, 103, el), true, "a few px off it");
  // Inside the bounding box but far from the diagonal.
  assert.equal(isPointInElement(200, 0, el), false, "opposite corner of the bbox");
});

test("a zero-length line is still clickable", () => {
  // len === 0 divides by zero in the projection, so it takes its own branch.
  const el = { type: "line", x1: 50, y1: 50, x2: 50, y2: 50 };
  assert.equal(isPointInElement(50, 50, el), true);
  assert.equal(isPointInElement(54, 50, el), true);
  assert.equal(isPointInElement(80, 50, el), false);
});

test("a line's hit area grows with its stroke width", () => {
  const thin = { type: "line", x1: 0, y1: 100, x2: 200, y2: 100, lineWidth: 2 };
  const fat = { ...thin, lineWidth: 40 };
  assert.equal(isPointInElement(100, 120, thin), false);
  assert.equal(isPointInElement(100, 120, fat), true);
});

test("a pen stroke is hit near its points and nowhere else", () => {
  const el = { type: "pen", lineWidth: 2, points: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }] };
  assert.equal(isPointInElement(100, 0, el), true, "on a point");
  assert.equal(isPointInElement(0, 0, el), true, "on the first point");
  // Inside the bounding box, but not near any recorded point.
  assert.equal(isPointInElement(50, 50, el), false, "interior of the bbox");
});

test("an empty pen stroke is never hit and never throws", () => {
  assert.equal(isPointInElement(0, 0, { type: "pen", points: [] }), false);
  assert.equal(isPointInElement(0, 0, { type: "pen" }), false);
});

test("an unknown element type is never hit", () => {
  assert.equal(isPointInElement(0, 0, { type: "wormhole", x: 0, y: 0 }), false);
});

/* ---------- rotation ---------- */

test("rotating a box moves its hit area with it", () => {
  // A wide, short box rotated 90 degrees should be hit above and below its
  // centre, and missed to the left and right — the opposite of unrotated.
  const flat = { type: "rect", x: 100, y: 190, width: 200, height: 20 };
  const upright = { ...flat, rotation: 90 };
  const { cx, cy } = elementCenter(flat);
  assert.deepEqual({ cx, cy }, { cx: 200, cy: 200 });

  assert.equal(isPointInElement(280, 200, flat), true, "flat: hit along its length");
  assert.equal(isPointInElement(280, 200, upright), false, "rotated: now a miss");
  assert.equal(isPointInElement(200, 280, flat), false, "flat: miss above");
  assert.equal(isPointInElement(200, 280, upright), true, "rotated: now a hit");
});

test("a full turn is the same as no rotation", () => {
  const el = rect();
  for (const rotation of [0, 360, -360, 720]) {
    assert.equal(
      isPointInElement(140, 120, { ...el, rotation }), true,
      `centre still hit at ${rotation} degrees`,
    );
  }
});

test("rotation is about the element's own centre, so the centre never moves", () => {
  // Whatever the angle, the centre point of an element is always on it.
  const cases = [
    rect(),
    { type: "circle", x: 200, y: 200, radius: 50 },
    { type: "ellipse", x: 200, y: 200, rx: 80, ry: 30 },
    { type: "line", x1: 0, y1: 0, x2: 200, y2: 100 },
  ];
  for (const el of cases) {
    const { cx, cy } = elementCenter(el);
    for (const rotation of [17, 45, 90, 133, 271]) {
      assert.equal(
        isPointInElement(cx, cy, { ...el, rotation }), true,
        `${el.type} at ${rotation} degrees`,
      );
    }
  }
});

test("the sign of the rotation is not arbitrary", () => {
  // Canvas Y grows downward, so a positive angle turns clockwise on screen. A
  // point off the right end of a flat box should, at +90, be found below the
  // centre rather than above it. Getting this backwards is the classic bug and
  // it looks fine for every symmetric shape, so pin it with an asymmetric one.
  const flat = { type: "rect", x: 100, y: 190, width: 200, height: 20, rotation: 90 };
  assert.equal(isPointInElement(200, 280, flat), true, "below centre");
  assert.equal(isPointInElement(200, 120, flat), true, "above centre — symmetric, also on it");

  // An asymmetric case: a line from the centre going right, rotated +90.
  const spoke = { type: "line", x1: 200, y1: 200, x2: 300, y2: 200, lineWidth: 2, rotation: 90 };
  const { cx, cy } = elementCenter(spoke);
  assert.deepEqual({ cx, cy }, { cx: 250, cy: 200 });
  // The far end (300,200) rotates about (250,200) by +90 to (250,250).
  assert.equal(isPointInElement(250, 250, spoke), true, "far end is now below the centre");
  assert.equal(isPointInElement(300, 200, spoke), false, "and no longer to the right");
});

/* ---------- bounds ---------- */

test("bounds pad outward on every side", () => {
  const b = getElementBounds(rect(), 6);
  assert.deepEqual(b, { x: 94, y: 94, width: 92, height: 52 });
  const tight = getElementBounds(rect(), 0);
  assert.deepEqual(tight, { x: 100, y: 100, width: 80, height: 40 });
});

test("a circle's bounds are its diameter, centred on it", () => {
  const b = getElementBounds({ type: "circle", x: 200, y: 200, radius: 50 }, 0);
  assert.deepEqual(b, { x: 150, y: 150, width: 100, height: 100 });
});

test("text bounds sit above the baseline", () => {
  // Canvas text is drawn from its baseline, so the box extends upward.
  const b = getElementBounds({ type: "text", x: 10, y: 100, text: "hi", fontSize: 20 }, 0);
  assert.equal(b.y, 80, "top is one font-size above the anchor");
  assert.equal(b.height, 20);
});

test("an element with no points falls back to a visible box, not zero", () => {
  // A zero-size bounding box would make an element unselectable and give the
  // TikZ emitter a degenerate flip origin.
  const b = getElementBounds({ type: "pen", x: 5, y: 7, points: [] });
  assert.ok(b.width > 0 && b.height > 0, "non-degenerate");
  assert.deepEqual(b, { x: 5, y: 7, width: 10, height: 10 });
});

test("bounds and the hit test agree about where an element is", () => {
  // Not a tautology: they are separate implementations, and the emitter uses
  // bounds while the editor uses the hit test. If they disagree, a shape
  // exports in a different place from where it was clicked.
  const cases = [
    rect(),
    { type: "circle", x: 200, y: 200, radius: 50 },
    { type: "ellipse", x: 200, y: 200, rx: 80, ry: 30 },
    { type: "ground", x: 300, y: 300 },
    { type: "graph", x: 0, y: 0, width: 200, height: 150 },
  ];
  for (const el of cases) {
    const b = getElementBounds(el, 0);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    assert.equal(isPointInElement(cx, cy, el), true, `${el.type}: bounds centre is on the element`);
    assert.equal(
      isPointInElement(b.x + b.width + 500, cy, el), false,
      `${el.type}: far outside the bounds is off the element`,
    );
  }
});

/* ---------- the type registries the switches depend on ---------- */

test("the three kind sets do not overlap", () => {
  // A type in two sets takes whichever branch is written first, silently.
  const sets = { BOX_KINDS, CIRC_KINDS, LINE_KINDS };
  for (const [aName, a] of Object.entries(sets)) {
    for (const [bName, b] of Object.entries(sets)) {
      if (aName >= bName) continue;
      const both = [...a].filter((t) => b.has(t));
      assert.deepEqual(both, [], `${aName} and ${bName} share: ${both.join(", ")}`);
    }
  }
});

test("every placeable shape can be hit once placed", () => {
  // DEFAULT_GEOMETRY is what click-to-place builds from. A kind listed there
  // that no branch of isPointInElement understands places a shape that draws
  // but cannot be selected or deleted.
  const unhittable = [];
  for (const [kind, g] of Object.entries(DEFAULT_GEOMETRY)) {
    let el;
    if (LINE_KINDS.has(kind)) el = { type: kind, x1: 100, y1: 100, x2: 100 + (g.dx || 100), y2: 100 + (g.dy || 0), lineWidth: 2 };
    else if (CIRC_KINDS.has(kind)) el = { type: kind, x: 100, y: 100, radius: g.radius || 40 };
    else if (kind === "ellipse") el = { type: kind, x: 100, y: 100, rx: g.rx, ry: g.ry };
    else if (kind === "text") el = { type: kind, x: 100, y: 100, text: "abc", fontSize: 16 };
    else if (kind === "ground") el = { type: kind, x: 100, y: 100 };
    else el = { type: kind, x: 100, y: 100, width: g.width || 100, height: g.height || 70 };

    const b = getElementBounds(el, 0);
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    if (!isPointInElement(cx, cy, el)) unhittable.push(kind);
  }
  assert.deepEqual(unhittable, [], `placeable but not selectable: ${unhittable.join(", ")}`);
});

/* ---------- the known divergence, pinned so it cannot drift further ---------- */

test("resize handles rotate about the box centre, which is NOT the shape centre for text and ground", () => {
  // The renderer (drawElement) and the hit test both rotate about
  // elementCenter(). app/page.js::handleAt instead rotates about the
  // bounding-box centre, because handles sit on the box.
  //
  // For most types those are the same point. For `text` and `ground` they are
  // not, so rotating one of those leaves its handles offset from the shape they
  // belong to — cosmetic, but real. This test records exactly where they differ
  // so the list cannot grow silently.
  const boxCentre = (el) => {
    const b = getElementBounds(el, 0);
    return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
  };

  const agree = [
    rect(),
    { type: "circle", x: 200, y: 200, radius: 50 },
    { type: "ellipse", x: 200, y: 200, rx: 80, ry: 30 },
    { type: "pen", points: [{ x: 0, y: 0 }, { x: 60, y: 40 }] },
    // A line's box is padded 20 units per side for circuit symbols, but the
    // padding is symmetric, so the centres still coincide.
    { type: "line", x1: 0, y1: 0, x2: 200, y2: 100 },
  ];
  for (const el of agree) {
    assert.deepEqual(elementCenter(el), boxCentre(el), `${el.type} agrees`);
  }

  // Text: rotation centre is half a font-size above the baseline; the box is
  // anchored the same way but is a full font-size tall.
  const text = { type: "text", x: 10, y: 100, text: "hello", fontSize: 20 };
  assert.deepEqual(elementCenter(text), { cx: 10, cy: 90 });
  assert.deepEqual(boxCentre(text), { cx: 40, cy: 90 }, "differs in x by half the text width");

  // Ground: the symbol hangs 35 units below its anchor, but it carries no
  // width/height, so elementCenter falls through to the generic branch and
  // returns the anchor itself. The box centre is 17.5 units lower.
  const ground = { type: "ground", x: 300, y: 300 };
  assert.deepEqual(elementCenter(ground), { cx: 300, cy: 300 });
  assert.deepEqual(boxCentre(ground), { cx: 300, cy: 317.5 }, "differs in y by half the symbol height");
});
