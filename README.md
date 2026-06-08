# TikZ Generator

A professional web application for creating LaTeX TikZ and CircuiTikZ diagrams using AI. Draw diagrams on a canvas and instantly convert them to clean, compile-ready TikZ code powered by Claude AI.

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
- **AI-Powered Code Generation**: Uses Claude Sonnet 4 to convert canvas drawings to elegant TikZ code
- **Live Preview**: Real-time TikZ rendering with TikZJax

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **AI Model**: Claude Sonnet 4 via Anthropic API
- **Styling**: Tailwind CSS 4
- **Rendering**: TikZJax for client-side LaTeX rendering

## Getting Started

### Prerequisites

- Node.js 18+ 
- An Anthropic API key ([get one here](https://console.anthropic.com/))

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

Edit `.env.local` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=your_api_key_here

# If using a third-party API provider, also add:
ANTHROPIC_BASE_URL=https://your-third-party-api.com/v1
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Draw**: Use the tools in the left sidebar to draw your diagram on the canvas
2. **Style**: Adjust colors, line width, and modifiers (dashed, arrows, fill)
3. **Generate**: Click "Generate TikZ Code" to convert your drawing to LaTeX code
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

Make sure to set `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY` in your production environment.

### Vercel Deployment

This app is optimized for Vercel:

```bash
vercel --prod
```

Don't forget to add your `ANTHROPIC_API_KEY` in the Vercel project settings.

## Architecture

- `/app/page.js` - Main canvas component with drawing logic
- `/app/api/generate-tikz/route.js` - API endpoint for Claude AI integration
- `/app/layout.js` - Root layout with metadata and viewport configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Claude AI](https://www.anthropic.com/claude) by Anthropic
- TikZ rendering by [TikZJax](https://tikzjax.com/)
- Inspired by [tikzmaker.com](https://tikzmaker.com/)

