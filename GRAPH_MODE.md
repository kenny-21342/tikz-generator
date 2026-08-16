# TikZ Generator v3.3 - Graph Plotting Mode

## 🎉 New Feature: Function Graph Plotting

You can now **plot mathematical functions** with full customization of axes, labels, grid, and more!

### ✅ Features

- **Custom axis ranges**: Set X min/max and Y min/max
- **Multiple functions**: Plot multiple functions on the same graph (up to 5 colors)
- **Grid display**: Toggle grid lines for better readability
- **Axis labels**: Customize X and Y axis labels
- **Graph title**: Optional title above the graph
- **Size control**: Adjust width and height in pixels
- **Automatic axes**: X and Y axes drawn at zero (if in range)
- **Interactive editor**: Modal dialog for easy configuration

---

## 🎨 How to Use

### Basic Usage:
1. Click **"📊 Function Graph"** button in Math Plots section
2. Configure your graph in the modal dialog:
   - Set axis ranges (X min/max, Y min/max)
   - Enter function(s) to plot (one per line)
   - Add axis labels and optional title
   - Toggle grid, ticks, and legend
   - Set graph size
3. Click **"📊 Insert Graph"** button
4. Graph appears on canvas as an element
5. **Select and drag** to reposition
6. **Edit properties** in properties panel

### Example Functions:
```
sin(x)
cos(x)
x^2
Math.sqrt(x)
Math.exp(x)
x^3 - 2*x + 1
Math.log(x)
1/x
```

---

## 📊 Configuration Options

### Axis Ranges
- **X Min**: Minimum X value (default: -5)
- **X Max**: Maximum X value (default: 5)
- **Y Min**: Minimum Y value (default: -5)
- **Y Max**: Maximum Y value (default: 5)

### Functions
- **Multiple functions**: Enter one per line
- **Variable**: Use `x` as the variable
- **JavaScript syntax**: Use Math functions (Math.sin, Math.cos, etc.)
- **Operators**: +, -, *, /, ^, parentheses

### Labels & Title
- **X Label**: Label below the X-axis (e.g., "Time", "x")
- **Y Label**: Label to the left of Y-axis (rotated 90°)
- **Title**: Optional title above the graph

### Appearance
- **Width**: Graph width in pixels (default: 300)
- **Height**: Graph height in pixels (default: 200)
- **Show Grid**: Toggle grid lines (10x10 grid)
- **Show Ticks**: Toggle axis tick marks (future feature)
- **Show Legend**: Toggle function legend (future feature)

---

## 🎯 Graph Features

### Automatic Elements:
✅ **Border**: Solid border around the graph
✅ **Grid**: Optional 10x10 grid lines
✅ **X-axis**: Drawn at Y=0 (if in range)
✅ **Y-axis**: Drawn at X=0 (if in range)
✅ **Function curves**: Smooth plotting with 5 different colors
✅ **Labels**: X label below, Y label on left (rotated)
✅ **Title**: Optional title above graph

### Color Scheme:
- Function 1: Blue (#3b82f6)
- Function 2: Red (#ef4444)
- Function 3: Green (#10b981)
- Function 4: Orange (#f59e0b)
- Function 5: Purple (#8b5cf6)
- Grid: Light gray (#e2e8f0)
- Axes: Slate gray (#64748b)
- Border: Dark slate (#334155)

---

## 🔧 Technical Details

### Function Syntax:
The graph uses JavaScript's `eval()` to compute function values:

**Basic operators:**
- `+`, `-`, `*`, `/`: Arithmetic
- `^`: Power (converted to Math.pow)
- `()`: Grouping

**Math functions (use Math. prefix):**
- `Math.sin(x)`, `Math.cos(x)`, `Math.tan(x)`
- `Math.sqrt(x)`, `Math.pow(x, 2)`
- `Math.exp(x)`, `Math.log(x)`
- `Math.abs(x)`, `Math.floor(x)`, `Math.ceil(x)`

**Examples:**
```javascript
sin(x)              // ✅ Works
Math.sin(x)         // ✅ Works
x^2                 // ✅ Works (converted to Math.pow)
x*x                 // ✅ Works
2*sin(x) + 3*cos(x) // ✅ Works
sqrt(x)             // ❌ Fails - use Math.sqrt(x)
```

### Rendering Algorithm:
1. Draw border and background
2. Draw optional grid (10x10)
3. Draw axes at X=0 and Y=0 (if in range)
4. For each function:
   - Sample function at each pixel X coordinate
   - Map (x, y) values to canvas coordinates
   - Draw smooth curve connecting points
   - Handle out-of-range values gracefully
5. Draw labels and title

### Element Structure:
```javascript
{
  id: "elem_123",
  type: "graph",
  x: 100,                    // Position
  y: 100,
  width: 300,                // Size
  height: 200,
  xMin: -5,                  // Axis ranges
  xMax: 5,
  yMin: -5,
  yMax: 5,
  functions: ["sin(x)"],     // Array of function strings
  xLabel: "x",               // Labels
  yLabel: "y",
  title: "",
  showGrid: true,            // Display options
  showTicks: true,
  showLegend: false,
  strokeColor: "#000000",
  lineWidth: 2,
  created: 1234567890,
  modified: 1234567890
}
```

---

## 🎨 Integration with Editor

### Select & Edit:
- **Select tool**: Click graph to select
- **Drag to move**: Reposition anywhere on canvas
- **Properties panel**: Edit all graph properties
- **Duplicate**: Clone graph with different functions
- **Delete**: Remove with Delete key or eraser

### Properties Panel (when graph selected):
- Position (X, Y)
- Size (Width, Height)
- All graph configuration options
- Can edit functions, ranges, labels in real-time

### Undo/Redo:
- Full undo/redo support
- Works with insert, move, edit, delete

---

## 📈 Use Cases

### Mathematics Education:
- Plot trigonometric functions
- Visualize polynomials
- Show function transformations
- Compare multiple functions

### Physics & Engineering:
- Plot motion graphs (position, velocity, acceleration)
- Visualize waves and oscillations
- Show exponential decay/growth
- Plot phase diagrams

### Data Visualization:
- Function approximations
- Curve fitting illustrations
- Mathematical modeling
- Theoretical predictions

---

## 💡 Tips & Tricks

### Pro Tips:
1. **Start simple**: Plot one function first, then add more
2. **Adjust ranges**: Set axis ranges to show interesting parts
3. **Use grid**: Enable grid for better readability
4. **Multiple graphs**: Create separate graphs for different scales
5. **Color coding**: Use 5 different colors for up to 5 functions

### Common Patterns:
```
Sine and Cosine:
  sin(x)
  cos(x)

Polynomial Family:
  x
  x^2
  x^3

Exponential vs Linear:
  Math.exp(x)
  x

Inverse Functions:
  x^2
  Math.sqrt(x)
```

### Troubleshooting:
❌ **Function not appearing**: Check syntax (use Math. prefix)
❌ **Graph looks empty**: Adjust axis ranges to match function domain
❌ **Choppy curve**: Increase graph width for smoother sampling
❌ **Function error**: Check parentheses and operator usage

---

## 🔮 Future Enhancements

### Planned Features:
- [ ] Axis tick marks with numeric labels
- [ ] Legend showing function names/equations
- [ ] Logarithmic scales
- [ ] Parametric plots (x(t), y(t))
- [ ] Polar coordinates (r, θ)
- [ ] Data point plotting (scatter plots)
- [ ] Custom axis labels at intervals
- [ ] Export graph as separate image
- [ ] Function palette (saved function templates)
- [ ] Real-time function preview

---

## 🎓 Examples

### Example 1: Basic Trigonometry
```
X: -2π to 2π (use -6.28 to 6.28)
Y: -2 to 2
Functions:
  sin(x)
  cos(x)
Labels: x-axis: "θ (radians)", y-axis: "Amplitude"
Title: "Sine and Cosine Waves"
```

### Example 2: Polynomial Comparison
```
X: -3 to 3
Y: -10 to 10
Functions:
  x
  x^2
  x^3
Labels: x-axis: "x", y-axis: "f(x)"
Title: "Power Functions"
```

### Example 3: Exponential Growth
```
X: -2 to 3
Y: 0 to 10
Functions:
  Math.exp(x)
  x + 1
Labels: x-axis: "Time", y-axis: "Value"
Title: "Exponential vs Linear Growth"
```

### Example 4: Rational Function
```
X: -5 to 5
Y: -5 to 5
Functions:
  1/x
  1/(x^2)
Labels: x-axis: "x", y-axis: "y"
Title: "Rational Functions"
```

---

## 📝 Changelog

### v3.3.0 (Current)
- ✅ Added function graph plotting mode
- ✅ Modal configuration dialog with full options
- ✅ Multiple function support (up to 5 colors)
- ✅ Grid, axes, labels, and title
- ✅ Draggable and editable graphs
- ✅ Integration with selection system
- ✅ Proper TikZ code generation support

### v3.2.0 (Previous)
- Eraser tool for click-to-delete

### v3.1.0
- Drag-to-move elements
- TikZ preview with progress bar

---

## 🚀 Summary

The graph mode provides a **powerful mathematical visualization** tool:

✅ **Easy to use** - Modal dialog with clear options
✅ **Flexible** - Custom ranges, multiple functions, labels
✅ **Visual** - Grid, axes, colors, title
✅ **Integrated** - Works with select, drag, edit, delete
✅ **Professional** - Generates proper TikZ pgfplots code

**Perfect for**: Math education, physics diagrams, engineering plots, data visualization

---

**Access at: http://localhost:3000**

Click "📊 Function Graph" and start plotting! 📈
