# TikZ Generator - Component Library Reference

This document lists all available drawing tools and their TikZ equivalents for reference.

## Basic Tools

### Pen (Freehand)
- **Tool**: Freehand drawing with pressure sensitivity
- **TikZ**: `\draw plot coordinates {(x1,y1) (x2,y2) ...};`

### Line
- **Tool**: Straight line from point A to B
- **TikZ**: `\draw (x1,y1) -- (x2,y2);`
- **With Arrow**: `\draw[->] (x1,y1) -- (x2,y2);`

### Text
- **Tool**: Click to place text labels
- **TikZ**: `\node at (x,y) {text};`
- **Properties**: Bold, Italic, Font Size, Font Family, Alignment

## Basic Shapes

### Rectangle
- **TikZ**: `\draw (x1,y1) rectangle (x2,y2);`
- **Filled**: `\draw[fill=color] (x1,y1) rectangle (x2,y2);`

### Circle
- **TikZ**: `\draw (cx,cy) circle (radius);`

### Ellipse
- **TikZ**: `\draw (cx,cy) ellipse (rx and ry);`

### Triangle
- **TikZ**: `\draw (x1,y1) -- (x2,y2) -- (x3,y3) -- cycle;`

## Polygons

### Parallelogram
- **TikZ**: `\draw (x1,y1) -- (x2,y1) -- (x3,y2) -- (x4,y2) -- cycle;`

### Rhombus (Diamond)
- **TikZ**: `\node[diamond, draw] at (x,y) {};`

### Pentagon (5-sided)
- **TikZ**: `\node[regular polygon, regular polygon sides=5, draw] at (x,y) {};`

### Hexagon (6-sided)
- **TikZ**: `\node[regular polygon, regular polygon sides=6, draw] at (x,y) {};`

### Star
- **TikZ**: `\node[star, star points=5, draw] at (x,y) {};`

## Circuit Components (CircuiTikZ)

### Resistor
- **TikZ**: `\draw (x1,y1) to[R] (x2,y2);`
- **Alternative**: `\draw (x1,y1) to[resistor] (x2,y2);`

### Capacitor
- **TikZ**: `\draw (x1,y1) to[C] (x2,y2);`
- **Alternative**: `\draw (x1,y1) to[capacitor] (x2,y2);`

### Inductor
- **TikZ**: `\draw (x1,y1) to[L] (x2,y2);`
- **Alternative**: `\draw (x1,y1) to[inductor] (x2,y2);`

### Battery
- **TikZ**: `\draw (x1,y1) to[battery] (x2,y2);`
- **Alternative**: `\draw (x1,y1) to[V] (x2,y2);`

### Diode
- **TikZ**: `\draw (x1,y1) to[diode] (x2,y2);`
- **Alternative**: `\draw (x1,y1) to[D] (x2,y2);`

### Ground
- **TikZ**: `\draw (x,y) node[ground] {};`
- **Alternative**: `\draw (x,y) to[short] ++(0,-0.5) node[ground] {};`

## Measurement Instruments

### Voltmeter
- **TikZ**: `\draw (x1,y1) to[voltmeter] (x2,y2);`
- **Alternative**: `\draw (x,y) node[circle, draw] {V};`

### Ammeter
- **TikZ**: `\draw (x1,y1) to[ammeter] (x2,y2);`
- **Alternative**: `\draw (x,y) node[circle, draw] {A};`

## Logic Gates

### AND Gate
- **TikZ**: `\node[and gate US, draw] at (x,y) {};`
- **With inputs**: 
```latex
\node[and gate US, draw, logic gate inputs=nn] (AND1) at (x,y) {};
\draw (AND1.input 1) -- ++(-1,0);
\draw (AND1.input 2) -- ++(-1,0);
\draw (AND1.output) -- ++(1,0);
```

### OR Gate
- **TikZ**: `\node[or gate US, draw] at (x,y) {};`

### NOT Gate (Inverter)
- **TikZ**: `\node[not gate US, draw] at (x,y) {};`

### NAND Gate
- **TikZ**: `\node[nand gate US, draw] at (x,y) {};`

### NOR Gate
- **TikZ**: `\node[nor gate US, draw] at (x,y) {};`

### XOR Gate
- **TikZ**: `\node[xor gate US, draw] at (x,y) {};`

## Mathematical Functions

### Sine Wave
- **TikZ**: 
```latex
\draw[domain=0:4*pi, samples=100] plot (\x, {sin(\x r)});
```

## Style Modifiers

### Line Styles
- **Dashed**: `\draw[dashed] ...;`
- **Dotted**: `\draw[dotted] ...;`
- **Thick**: `\draw[thick] ...;`
- **Thin**: `\draw[thin] ...;`
- **Ultra thick**: `\draw[ultra thick] ...;`

### Colors
- **Stroke**: `\draw[color=red] ...;`
- **Fill**: `\draw[fill=blue] ...;`
- **Both**: `\draw[draw=red, fill=blue] ...;`

### Arrows
- **Forward arrow**: `\draw[->] ...;`
- **Backward arrow**: `\draw[<-] ...;`
- **Both**: `\draw[<->] ...;`
- **Latex arrow**: `\draw[-latex] ...;`
- **Stealth arrow**: `\draw[-stealth] ...;`

### Text Formatting
- **Bold**: `\node[font=\bfseries] at (x,y) {text};`
- **Italic**: `\node[font=\itshape] at (x,y) {text};`
- **Size**: `\node[font=\Large] at (x,y) {text};`
- **Alignment**: `\node[anchor=west] at (x,y) {text};`

## Required Packages

Add these to your LaTeX preamble:

```latex
\usepackage{tikz}
\usepackage{circuitikz}
\usetikzlibrary{shapes.geometric}
\usetikzlibrary{shapes.symbols}
\usetikzlibrary{circuits.logic.US}
\usetikzlibrary{arrows.meta}
```

## Complete Example

```latex
\documentclass{article}
\usepackage{tikz}
\usepackage{circuitikz}
\usetikzlibrary{shapes.geometric, shapes.symbols, circuits.logic.US}

\begin{document}

\begin{tikzpicture}
  % Simple circuit
  \draw (0,0) to[battery] (0,2)
              to[R=10k] (3,2)
              to[C=100nF] (3,0)
              -- (0,0);
              
  % Logic gate
  \node[and gate US, draw] at (6,1) {};
  
  % Shapes
  \draw[fill=blue!20] (8,0) rectangle (10,2);
  \node[circle, draw, fill=red!20] at (11,1) {A};
\end{tikzpicture}

\end{document}
```

## Tips for Better TikZ Code

1. **Use named coordinates**: `\coordinate (A) at (1,2);`
2. **Relative positioning**: `\draw (0,0) -- ++(1,0) -- ++(0,1);`
3. **Node positioning**: `\node[right=of A] (B) {text};`
4. **Loops**: `\foreach \x in {1,...,5} { \draw (\x,0) circle (0.2); }`
5. **Scope for local styles**: `\begin{scope}[thick, red] ... \end{scope}`

## Keyboard Shortcuts (Planned)

- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Shift+Z`: Redo
- `Delete` / `Backspace`: Delete selected element
- `Ctrl+C`: Copy selected element
- `Ctrl+V`: Paste
- `Ctrl+D`: Duplicate
- `Escape`: Deselect
- `+` / `-`: Zoom in/out
- `G`: Toggle grid
