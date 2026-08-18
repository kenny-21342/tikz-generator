import "./globals.css";

export const metadata = {
  title: "TikZ Generator - Draw LaTeX Diagrams",
  description: "Professional TikZ and CircuiTikZ diagram generator. Draw diagrams on a canvas and convert them to compile-ready LaTeX code.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

// Next's viewport export rather than a hand-written <meta> so the tag is deduped
// with the framework's own. `maximumScale`/`userScalable` are deliberately left at
// their defaults: pinning them blocks pinch-zoom, which fails WCAG 1.4.4.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f1f5f9",
  colorScheme: "light",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      {/*
        The TikZJax engine renders inside a hidden iframe (/tj/preview-host.html)
        and posts the serialized SVG back here. That SVG positions every glyph as
        <text font-family="cmr10"> and friends — Computer Modern faces that exist
        only as @font-face rules in /tikzjax/fonts.css. The iframe loads that
        stylesheet, but @font-face does not cross documents, so without this the
        parent renders shapes correctly and every letter, digit and math symbol as
        a tofu box.

        React hoists this into <head> itself, so there is no manual <head> element
        here — the root layout must not hand-roll one. The href stays absolute so
        the relative font URLs inside fonts.css resolve against /tikzjax/, and
        browsers fetch only the faces a diagram actually references, not all 152.
      */}
      {/*
        eslint-disable-next-line @next/next/no-css-tags --
        The rule wants CSS imported through the bundler, which cannot work here:
        fonts.css is a vendored engine asset served from public/, and its @font-face
        rules use URLs relative to their own location. Bundling it would move the
        stylesheet to /_next/static/css/ and every font URL would 404.
      */}
      <link rel="stylesheet" href="/tikzjax/fonts.css" />
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
