# TikZ Generator v3.0 - Quick Start Guide

## 🚀 Getting Started

The selection system is now live! Here's how to use it:

### 1. Drawing Shapes
- Click any tool in the left sidebar
- Click and drag on the canvas to draw
- Release to finalize

### 2. Selecting & Editing
1. Click the **"⬚ Select"** tool
2. Click any shape on the canvas
3. Properties panel appears on the right
4. Edit properties in real-time:
   - Position (X, Y)
   - Size (Width, Height, Radius)
   - Colors (Stroke, Fill)
   - Line style (Width, Dashed, Arrow)
   - Text content and size

### 3. Managing Elements
- **Duplicate**: Click "📋 Duplicate" button
- **Delete**: Click "🗑️ Delete" or press Delete/Backspace
- **Deselect**: Press Escape

### 4. Keyboard Shortcuts
- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Shift+Z` - Redo
- `Delete` / `Backspace` - Delete selected element
- `Escape` - Deselect

### 5. Zoom & Grid
- **Zoom**: Use +/- buttons or mouse wheel (10%-500%)
- **Grid**: Toggle grid visibility with checkbox
- **Snap**: Enable snap-to-grid for precise alignment

### 6. Saving Projects
- **Save**: Click "💾 Save Project" → Downloads `.tikz.json` file
- **Load**: Click "📁 Load Project" → Select your saved file
- **Auto-save**: Automatically saves every 30 seconds to browser
- **Recovery**: On page reload, you'll be prompted to recover

### 7. Generating TikZ Code
1. Draw and arrange your elements
2. Select and edit for precision
3. Click "🤖 Generate TikZ Code with AI"
4. Switch to "Code" tab to see the result
5. Copy and use in your LaTeX document

## 🎨 What's New?

### Major Features
✅ **Selection System** - Click to select any element
✅ **Properties Panel** - Edit elements after drawing
✅ **Element Tracking** - Every shape is now an object
✅ **Better Undo/Redo** - Works with individual elements
✅ **Zoom Controls** - Navigate large diagrams
✅ **Grid & Snap** - Precise alignment
✅ **Save/Load** - Full project management
✅ **Auto-save** - Never lose your work

### Breaking Changes
⚠️ **Project files from v2.0 are NOT compatible with v3.0**
⚠️ **v3.0 uses element-based architecture instead of canvas snapshots**

## 🎯 Access the App

Open your browser and go to:
**http://localhost:3000**

The development server is already running!

## 📚 Documentation

- **Full Implementation Guide**: `SELECTION_SYSTEM_GUIDE.md`
- **Implementation Plan**: `IMPLEMENTATION_PLAN.md`
- **Component Library**: `COMPONENTS.md`
- **Current status**: `STATUS.md`

## 🆘 Troubleshooting

### Issue: Can't select elements
**Solution**: Make sure you've clicked the "⬚ Select" tool first

### Issue: Properties panel doesn't appear
**Solution**: Click directly on a shape (with Select tool active)

### Issue: Lost work after refresh
**Solution**: Check for auto-save recovery prompt on page load

### Issue: Can't edit properties
**Solution**: Make sure an element is selected (blue outline visible)

## 🎉 You're Ready!

Start creating beautiful TikZ diagrams with the new selection system!
