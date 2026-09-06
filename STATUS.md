# Status

**Shipped.** Live at <https://tikz.busypizza.bond>. Last verified 2026-09-06.

The feature work is done. What follows is what was decided, what changed since
those decisions, and the two things still outstanding — both of them
housekeeping rather than features.

## Decisions, and what became of them

**Ship v2, defer the v3 selection refactor** (2026-08-16). Superseded. The
refactor was estimated at 12–15 hours and 1500–2000 lines and was deferred as a
post-launch milestone on a feature flag. It was built anyway and is in
`app/page.js` today, unflagged and in production:

| what | where |
|---|---|
| elements as objects with ids, not canvas pixels | `page.js:471` |
| `elementAt(x, y)` hit testing, inverse-rotated for rotated elements | `page.js:875` |
| selection, hover, rotation handle, resize handles | `page.js:477`, `917` |
| drag, duplicate, delete | `page.js:1163`, `737`, `729` |
| per-element live editing | `page.js:753` |
| properties panel — stroke, width, font, LaTeX toggle | `page.js:2125` |
| undo/redo over element snapshots | `page.js:571` |
| grid, snap, zoom, pan | throughout |
| project save/load as `.tikz.json` | `page.js:1609` |

Nothing from the old "Option A / B / C / D" framing applies any more. Grid,
zoom, pan and save/load were all listed there as future work and all exist.

**Remove AI generation entirely** (commit `cb51b01`). Done, and it stuck. Code
generation is local and deterministic — derived from the relative positions of
elements on the canvas. There is no backend, no model provider, no API key, and
nothing to configure. Any document in this repo that describes AI generation is
describing a version that no longer exists.

**iPad is out of scope** (2026-09-06). Not a removal: Apple Pencil pressure
(`page.js:868`), palm rejection (`page.js:987`) and the deferred
`setPointerCapture` that works around an iPadOS WebKit bug (`page.js:1002`) are
all implemented and stay. It means no further iPad-specific work or device QA
is planned.

## Verified

- `npm run lint` and `npm run build` — green
- `npm test` — 33 passing, all covering `lib/`
- working tree clean, nothing unpushed
- production deployment `READY`, same commit date as `main`
- `tikz.busypizza.bond` — HTTP 200, TLS verifies

## Outstanding

1. **`app/page.js` has no tests.** It is 3,189 lines and holds the riskiest
   code in the project: hit testing, the screen-to-local transform for dragging
   rotated elements (`page.js:1163`), and resize-handle math. The pure geometry
   is extractable and testable the same way `lib/geometry.js` already is.
2. **Other documents in this repo are stale.** `IMPLEMENTATION_COMPLETE.md` and
   `SELECTION_SYSTEM_GUIDE.md` both still describe AI generation and the
   unbuilt selection system. `README.md` is accurate and is the file to trust.

## Where things live

- `app/page.js` — the whole editor
- `lib/tikz.js` — TikZ emitter (tested)
- `lib/expr.js` — expression parser for graph mode (tested)
- `lib/geometry.js` — shape geometry
- `archive/` — six superseded copies of `page.js`, including the abandoned
  `page-v3-selection.js`. Kept as history; nothing imports them.
