# TikZ Generator

A web application for creating LaTeX TikZ and CircuiTikZ diagrams. Draw on a canvas
and get clean, compile-ready TikZ code.

Everything runs in the browser. Code generation is **local and deterministic** — the
TikZ is derived from the relative positions of the elements on the canvas, so it is
instant, works offline, and always round-trips to exactly what you drew. Previews
compile in-browser via TikZJax (WebAssembly TeX). There is no backend, no model
provider, no API key, and nothing to configure.

## Features

- **Drawing canvas** — freehand pen, lines, shapes (rectangle, rounded rectangle,
  circle, ellipse, triangle), and 30+ placeable components
- **Circuit elements** — resistor, capacitor, inductor, battery, diode, ground,
  voltmeter, ammeter for CircuiTikZ diagrams
- **Logic gates** — AND, OR, NOT, NAND, NOR, XOR
- **Polygons** — parallelogram, rhombus, pentagon, hexagon, star
- **Text and math** — plain labels or LaTeX formulas, rendered with real Computer
  Modern in the preview
- **Graph mode** — function plotting with configurable axes and ranges
- **Style controls** — stroke colour, line width, dashed lines, arrowheads, fills,
  rotation
- **Apple Pencil** — pressure-sensitive strokes and palm rejection on iPad
- **Editor** — 30-level undo/redo, grid and snap, zoom and pan, selection with a
  properties panel, keyboard shortcuts
- **Project files** — save/load as JSON, autosave to `localStorage` with
  restore-on-reload
- **Export** — copy TikZ to clipboard, download `.tex`, export the canvas as PNG
- **Live preview** — client-side LaTeX rendering via
  [TikZJax](https://github.com/drgrice1/tikzjax), with zoom

## Tech stack

- **Framework** — Next.js 16 (App Router), React 19
- **Styling** — Tailwind CSS 4
- **Rendering** — TikZJax (WebAssembly TeX) in the browser, isolated in a hidden
  iframe; no server-side TeX required

## Getting started

### Prerequisites

Node.js 18+. That is the whole list — no TeX distribution, no API keys, no
environment variables.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Usage

1. **Draw** — pick a tool from the toolbar and draw on the canvas
2. **Style** — select an element and edit it in the properties panel
3. **Generate** — the code panel updates live as you draw; **View Code** opens it
4. **Preview** — switch to the Preview tab and press **Render**
5. **Export** — copy to clipboard, download `.tex`, or export a PNG

### Apple Pencil / iPad

Pressure sensitivity, palm rejection via pointer events, and a viewport tuned for
full-screen drawing. Open the app in Safari on iPad and draw.

> Pointer capture is deliberately deferred until a pen or touch pointer actually
> moves. Capturing on every `pointerdown` triggers an iPadOS WebKit bug that leaves
> capture stuck on the canvas and silently swallows every later tap on the toolbar.

## Deployment

The app is fully static — the production build emits only `/` and `/_not-found`,
with no API routes — so it deploys anywhere.

```bash
npm run build
npm start
```

For Vercel: `vercel --prod`. No environment variables need to be set.

## The TikZJax preview

The engine is vendored under `public/tikzjax/` (~15 MB, dominated by
`core.dump.gz`) and version-pinned, with `Cache-Control: immutable` set in
`next.config.mjs` so a returning browser never re-downloads it. Expect roughly 8 s
on a first-ever visit and well under a second thereafter.

Two implementation details are load-bearing:

**The engine runs in a hidden iframe** (`public/tj/preview-host.html`). Injecting it
directly into the React page made the TeX worker hang; a separate browsing context
keeps the app's globals and re-renders away from the worker. The iframe posts the
serialized SVG back via `postMessage`.

**`fonts.css` is linked from the root layout, not just the iframe.** The SVG that
comes back positions every glyph as `<text font-family="cmr10">` and similar —
Computer Modern faces that exist only as `@font-face` rules in
`/tikzjax/fonts.css`. `@font-face` does not cross documents, so if the parent
document lacks that stylesheet, shapes render correctly while every letter, digit
and math symbol becomes a tofu box. The link stays absolute so the relative font
URLs inside the stylesheet resolve against `/tikzjax/`.

## Architecture

- `app/page.js` — canvas, editing, local deterministic TikZ generation, graph mode,
  and the preview host bridge
- `app/layout.js` — root layout, metadata, viewport, and the TikZJax font stylesheet
- `public/tj/preview-host.html` — isolated TikZJax host
- `public/tikzjax/` — vendored WebAssembly TeX engine and Computer Modern fonts
- `next.config.mjs` — immutable caching for the engine assets

## License

MIT

## Acknowledgments

- Inspired by [tikzmaker.com](https://tikzmaker.com/)
- Preview powered by [TikZJax](https://github.com/drgrice1/tikzjax)
