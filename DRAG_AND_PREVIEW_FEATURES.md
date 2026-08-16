# TikZ Generator v3.1 - Drag & Preview Updates

## 🎉 New Features Added

### 1. Drag-to-Move Elements ✅

You can now **drag selected elements** to reposition them on the canvas!

#### How to Use:
1. Click the **"⬚ Select"** tool
2. Click on any element to select it
3. **Click and drag** the element to move it
4. Release to drop it in the new position
5. Position is automatically saved to history (undo/redo works)

#### Features:
- **Visual feedback**: Cursor changes to "move" when hovering over draggable elements
- **Real-time movement**: Element moves smoothly as you drag
- **Works with all element types**: 
  - Single-point elements (rect, circle, text, etc.)
  - Line-based elements (line, resistor, capacitor, etc.)
  - Path elements (pen strokes, sine waves)
- **Respects zoom/pan**: Dragging works correctly at any zoom level
- **Undo support**: Can undo/redo drag operations

#### Technical Details:
- Dragging starts on `pointerdown` when clicking a selected element
- Position updates continuously during `pointermove`
- Final position saved to history on `pointerup`
- All coordinate transforms (zoom/pan) are properly handled

---

### 2. TikZ Preview with Progress Bar ✅

Generate **high-quality preview images** using your local LaTeX installation!

#### How to Use:
1. Draw your diagram and generate TikZ code
2. Switch to the **"Preview"** tab
3. Click **"🖼️ Render Preview"** button
4. Watch the progress bar as it:
   - Prepares LaTeX document
   - Compiles with pdflatex
   - Converts PDF to PNG
5. View the rendered image

#### Features:
- **Progress bar**: Visual feedback during rendering (0-100%)
- **Status messages**: Shows current step (compiling, converting, etc.)
- **Error handling**: Clear error messages if compilation fails
- **High quality**: 300 DPI PNG output
- **Uses local TeX**: Leverages your system's pdflatex installation

#### System Requirements:
- **Required**: `pdflatex` (part of TeX Live, MiKTeX, MacTeX)
- **Required for conversion** (one of):
  - `convert` (ImageMagick) - Recommended
  - `pdftoppm` (poppler-utils)
  - `sips` (macOS only, built-in)

#### Installation:

**macOS:**
```bash
# Install MacTeX (includes pdflatex)
brew install --cask mactex

# Install ImageMagick for conversion
brew install imagemagick
```

**Linux (Ubuntu/Debian):**
```bash
# Install TeX Live
sudo apt-get install texlive-full

# Install ImageMagick
sudo apt-get install imagemagick

# Or install poppler-utils as alternative
sudo apt-get install poppler-utils
```

**Windows:**
```bash
# Install MiKTeX from https://miktex.org/
# Install ImageMagick from https://imagemagick.org/
```

#### API Endpoint:
New endpoint: `POST /api/render-tikz`

```javascript
// Request
{
  "tikzCode": "\\begin{tikzpicture}...\\end{tikzpicture}"
}

// Response (success)
{
  "success": true,
  "image": "data:image/png;base64,..."
}

// Response (error)
{
  "error": "LaTeX compilation failed",
  "compileOutput": "...",
  "details": "..."
}
```

#### Progress Bar Details:
- **0-90%**: Simulated progress during compilation
- **100%**: Conversion complete, image ready
- **Updates every 200ms** for smooth animation
- **Automatic cleanup** after render complete

---

## 🎨 Updated User Experience

### Cursor Changes
- **Select tool + hovering element**: `cursor-move` (indicates draggable)
- **Select tool + empty space**: `cursor-default`
- **Drawing tools**: `cursor-crosshair`

### Keyboard Shortcuts (Unchanged)
- `Ctrl+Z` / `Cmd+Z` - Undo (works with dragging)
- `Ctrl+Y` / `Cmd+Shift+Z` - Redo
- `Delete` / `Backspace` - Delete selected element
- `Escape` - Deselect

---

## 🔧 Technical Implementation

### Drag System Architecture

**State Management:**
```javascript
const [isDragging, setIsDragging] = useState(false);
const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
const [dragElementStart, setDragElementStart] = useState(null);
```

**Drag Flow:**
1. **pointerdown**: Store start position and element's original coordinates
2. **pointermove**: Calculate delta and update element position in real-time
3. **pointerup**: Save final position to history

**Element Position Updates:**
- `x, y` elements: Update both coordinates
- `x1, y1, x2, y2` elements: Update all four coordinates
- `points[]` elements: Update each point in the array

### Preview System Architecture

**Rendering Pipeline:**
1. Accept TikZ code from frontend
2. Create full LaTeX document with packages
3. Write to temporary file in `/tmp`
4. Execute `pdflatex` to compile PDF
5. Convert PDF to PNG using available tool
6. Return base64-encoded image
7. Cleanup temporary files

**Error Handling:**
- Parses LaTeX log for specific error messages
- Returns compilation output for debugging
- Handles missing dependencies gracefully
- Suggests fallback conversion tools

---

## 📊 Performance Considerations

### Dragging Performance
- **Optimized rendering**: Only re-renders affected elements
- **No history spam**: History only saved on drag end
- **Smooth updates**: Direct state updates during drag
- **Works at any zoom**: Coordinate transforms are efficient

### Preview Rendering
- **Async processing**: Non-blocking UI during compilation
- **Progress updates**: Keeps UI responsive
- **Automatic cleanup**: Temporary files removed after each render
- **Timeout protection**: Long-running compilations will eventually fail

---

## 🐛 Known Limitations

### Dragging
- **No multi-select drag**: Can only drag one element at a time
- **No constrained dragging**: No shift-to-lock-axis (yet)
- **No drag preview**: Element moves directly (no ghost copy)

### Preview
- **Requires local TeX**: Cannot render without pdflatex
- **Sync rendering**: One preview at a time
- **No caching**: Each render recompiles from scratch
- **File system access**: Needs write permissions to /tmp

---

## 🎯 Future Enhancements

### Drag System
- [ ] Multi-select drag (drag multiple elements together)
- [ ] Constrained dragging (Shift to lock to horizontal/vertical)
- [ ] Drag preview (ghost outline while dragging)
- [ ] Snap-to-element (align to other elements)
- [ ] Drag distance indicators

### Preview System
- [ ] Preview caching (don't recompile unchanged code)
- [ ] Real-time preview (compile as you type)
- [ ] Cloud rendering option (for users without local TeX)
- [ ] SVG output option (vector graphics)
- [ ] Custom resolution selection

---

## 🚀 Quick Start Guide

### Using Drag-to-Move:
```
1. Click "Select" tool
2. Click any element
3. Drag to new position
4. Release mouse
✅ Done! Position saved
```

### Using Preview Rendering:
```
1. Draw your diagram
2. Generate TikZ code
3. Go to "Preview" tab
4. Click "Render Preview"
5. Wait for progress bar (3-10 seconds)
✅ Preview appears!
```

---

## 📝 Changelog

### v3.1.0 (Current)
- ✅ Added drag-to-move for selected elements
- ✅ Added TikZ preview rendering with local TeX
- ✅ Added progress bar for preview generation
- ✅ Added cursor change indicators for draggable elements
- ✅ Added new API endpoint `/api/render-tikz`
- ✅ Improved user feedback during long operations

### v3.0.0 (Previous)
- Element tracking system
- Selection system with properties panel
- Grid and snap-to-grid
- Zoom controls (10%-500%)
- Save/Load projects
- Auto-save every 30 seconds
- 30+ drawing tools

---

## 🆘 Troubleshooting

### "Element won't drag"
**Solution**: Make sure you're using the Select tool (⬚) and the element is selected

### "Preview rendering fails"
**Solution**: 
1. Check if pdflatex is installed: `which pdflatex`
2. Check if ImageMagick is installed: `which convert`
3. Try installing: `brew install mactex imagemagick` (macOS)

### "Preview progress stuck at 90%"
**Possible causes**:
- LaTeX compilation error in code
- Missing LaTeX packages (tikz, circuitikz)
- Check browser console for error details

### "Permission denied during preview"
**Solution**: Ensure Node.js process has write access to `/tmp` directory

---

## 🎉 Conclusion

Your TikZ Generator now has:
- **Interactive dragging** for easy repositioning
- **High-quality preview** using local LaTeX
- **Progress indicators** for better UX
- **Professional workflow** from design to preview

**Ready to use at: http://localhost:3000**

Enjoy the enhanced features! 🚀
