import "./globals.css";

export const metadata = {
  title: "TikZ Generator - Create LaTeX Diagrams with AI",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
