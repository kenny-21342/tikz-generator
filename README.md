# TikZ Generator

A professional web application for creating LaTeX TikZ and CircuiTikZ diagrams. Draw diagrams on a canvas and instantly convert them to clean, compile-ready TikZ code. Diagram and function-plot generation is local and deterministic; upload an image and the server converts it to TikZ via a Gemini / OpenAI-compatible model.

## Features

- **Intuitive Drawing Canvas**: Freehand drawing with pen tool, shapes (rectangles, circles, triangles), and straight lines
- **Circuit Elements**: Built-in resistor, capacitor, and inductor components for CircuiTikZ diagrams
- **Mathematical Plots**: Sine wave generator with axis guidelines
- **Style Controls**: 
  - Adjustable line width and color
  - Dashed line support
  - Arrow heads for vectors
  - Fill colors for shapes
- **Apple Pencil Support**: Pressure-sensitive drawing on iPad with proper touch handling
- **Advanced Features**:
  - Undo/Redo with 30-level history
  - Image import for tracing
  - Session persistence (saves last generated code)
  - Copy to clipboard
  - Download as .tex file
- **AI Image-to-TikZ**: Upload a screenshot or diagram and the server reproduces it as compile-ready TikZ (requires an API key)
- **Live Preview**: Server-side LaTeX compilation (pdflatex) rendered to PNG with zoom controls

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI Model**: Configurable Gemini / OpenAI-compatible model (only used for image-to-TikZ conversion)
- **Styling**: Tailwind CSS 4
- **Rendering**: Server-side pdflatex, converted to PNG via pdftoppm / sips / ImageMagick

## Getting Started

### Prerequisites

- Node.js 18+
- An API key for image-to-TikZ conversion — Gemini (`GEMINI_API_KEY`) or any
  OpenAI-compatible proxy. Diagram and graph generation work without a key.
- A TeX distribution (`pdflatex`) plus a PDF→PNG converter (`pdftoppm`,
  macOS `sips`, or ImageMagick) for the preview renderer.

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd tikz-generator
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API key:
```
GEMINI_API_KEY=your_api_key_here

# If using a proxy that bridges Anthropic, this key works too:
# ANTHROPIC_API_KEY=your_api_key_here

# Optional overrides for proxies / custom models:
# GEMINI_AUTH_KEY=your_proxy_auth_key_here
# GEMINI_BASE_URL=https://your-third-party-api.com/v1
# GEMINI_MODEL=gemini-3.5-flash
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Draw**: Use the tools in the left sidebar to draw your diagram on the canvas
2. **Style**: Adjust colors, line width, and modifiers (dashed, arrows, fill)
3. **Generate**: Click "View Code" to convert your drawing to LaTeX code
4. **Preview**: View the rendered result in the Code tab
5. **Export**: Copy to clipboard or download as a .tex file

### Apple Pencil / iPad

The app fully supports Apple Pencil with:
- Pressure sensitivity (thicker strokes with more pressure)
- Palm rejection via pointer events
- Optimized viewport for full-screen drawing

Simply open the app in Safari on your iPad and start drawing with the Apple Pencil.

## Production Deployment

### Build

```bash
npm run build
npm start
```

### Environment Variables

Make sure to set `GEMINI_API_KEY` (or `GEMINI_AUTH_KEY` / `ANTHROPIC_API_KEY` for
proxies) in your production environment. The preview renderer requires a TeX
distribution and a PDF→PNG converter on the server PATH.

AI generation also supports these optional spend controls:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `AI_RATE_LIMIT_PER_HOUR` | `10` | AI calls allowed per source IP per hour |
| `AI_RATE_LIMIT_PER_DAY` | `40` | AI calls allowed per source IP per day |
| `AI_GLOBAL_LIMIT_PER_DAY` | `500` | AI calls allowed per server instance per day |
| `AI_MAX_TOKENS` | `4096` | Maximum output tokens per request (hard ceiling: `8192`) |

These counters are in memory. On serverless hosts they reset on cold starts and
are not shared between instances, so they are an abuse speed bump rather than a
billing guarantee. Before deploying, configure a hard monthly budget and alerts
in the AI provider's billing console. A durable cross-instance limit requires a
shared atomic store such as Redis or Upstash.

Both API routes enforce input limits. Image generation accepts base64 image data
URLs up to roughly 8 MB, element prompts are capped at 1 MB, and preview source
is capped at 200,000 characters. The preview renderer rejects TeX file I/O,
shell escapes, and user-supplied preamble commands.

### Vercel Deployment

This app is optimized for Vercel:

```bash
vercel --prod
```

Don't forget to add your `GEMINI_API_KEY` in the Vercel project settings.

## Architecture

- `/app/page.js` - Main canvas component: drawing, editing, local deterministic TikZ generation, and graphing mode
- `/app/api/generate-tikz/route.js` - API endpoint for AI image-to-TikZ conversion (OpenAI-compatible; Gemini or proxy)
- `/app/api/render-tikz/route.js` - Compiles TikZ with pdflatex and converts the PDF to a PNG preview
- `/lib/routeGuards.js` - Pure payload validation shared by the API routes and tests
- `/lib/rateLimit.js` - In-process fixed-window request limiter
- `/app/layout.js` - Root layout with metadata and viewport configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Inspired by [tikzmaker.com](https://tikzmaker.com/)
