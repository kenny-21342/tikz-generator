# Implementation Roadmap: Selection System & Enhanced Features

## Overview
This document outlines the architecture needed to add element selection, properties panel, grid, zoom, and save/load functionality to the TikZ Generator.

---

## Phase 1: Element Tracking System (Foundation)

### Current Architecture
- Draws directly to canvas (immediate mode)
- No element persistence
- History via canvas snapshots

### New Architecture Needed
- Store elements as objects in state
- Render from element array
- Track element metadata

### Element Data Structure
```javascript
const element = {
  id: unique_id,
  type: 'rect' | 'circle' | 'line' | 'pen' | 'text' | etc,
  
  // Position & Size
  x, y, width, height, radius, startX, startY, endX, endY,
  points: [{x, y}], // for pen tool
  
  // Styling
  strokeColor: '#000000',
  fillColor: 'transparent',
  lineWidth: 3,
  isDashed: false,
  hasArrow: false,
  
  // Text properties
  text: 'Label',
  fontFamily: 'sans-serif',
  fontSize: 16,
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'left',
  
  // Transform
  rotation: 0,
  opacity: 1,
  
  // Metadata
  created: timestamp,
  modified: timestamp,
  layer: 0
};
```

### Implementation Steps
1. Replace `historyRef` with `elements` state array
2. Add `elementIdCounter` ref for unique IDs
3. Modify drawing functions to create element objects
4. Create `renderElements()` function to draw all elements
5. Update undo/redo to work with elements array

---

## Phase 2: Selection System

### Click Detection
```javascript
function getElementAtPoint(x, y) {
  // Iterate elements in reverse (top to bottom)
  for (let i = elements.length - 1; i >= 0; i--) {
    const elem = elements[i];
    if (isPointInElement(x, y, elem)) {
      return elem.id;
    }
  }
  return null;
}

function isPointInElement(x, y, element) {
  switch (element.type) {
    case 'rect':
      return x >= element.x && x <= element.x + element.width &&
             y >= element.y && y <= element.y + element.height;
    case 'circle':
      const dist = Math.sqrt((x - element.x)**2 + (y - element.y)**2);
      return dist <= element.radius;
    // ... etc for each type
  }
}
```

### Selection Rendering
```javascript
function renderSelection(ctx, element) {
  const bounds = getElementBounds(element);
  
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2 / zoom; // Scale with zoom
  ctx.setLineDash([5 / zoom, 5 / zoom]);
  
  // Draw bounding box
  ctx.strokeRect(
    bounds.x - 5,
    bounds.y - 5,
    bounds.width + 10,
    bounds.height + 10
  );
  
  // Draw resize handles
  drawResizeHandles(ctx, bounds);
  
  ctx.restore();
}
```

### Event Handling
```javascript
function handleCanvasClick(e) {
  const {x, y} = getTransformedCoordinates(e); // Account for zoom/pan
  
  if (tool === 'select') {
    const clickedId = getElementAtPoint(x, y);
    setSelectedId(clickedId);
    if (clickedId) {
      setShowProperties(true);
      loadElementProperties(clickedId);
    }
  } else {
    // Drawing mode
    startDrawing(x, y);
  }
}
```

---

## Phase 3: Properties Panel (Right Sidebar)

### Layout
```jsx
{showProperties && selectedElement && (
  <aside className="w-80 bg-white rounded-xl shadow-sm p-5 ml-4 shrink-0">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-bold">Properties</h3>
      <button onClick={() => setShowProperties(false)}>✕</button>
    </div>
    
    {/* Element Info */}
    <div className="mb-4 p-3 bg-slate-50 rounded">
      <p className="text-xs text-slate-600">Type: {selectedElement.type}</p>
      <p className="text-xs text-slate-600">ID: {selectedElement.id}</p>
    </div>
    
    {/* Position & Size */}
    <PropertySection title="Transform">
      <NumberInput label="X" value={selectedElement.x} onChange={...} />
      <NumberInput label="Y" value={selectedElement.y} onChange={...} />
      <NumberInput label="Rotation" value={rotation} min={0} max={360} />
      <SliderInput label="Opacity" value={opacity} min={0} max={1} step={0.1} />
    </PropertySection>
    
    {/* Text Properties (if type === 'text') */}
    {selectedElement.type === 'text' && (
      <PropertySection title="Text">
        <TextInput label="Content" value={selectedElement.text} />
        <CheckboxGroup>
          <Checkbox label="Bold" checked={bold} onChange={...} />
          <Checkbox label="Italic" checked={italic} onChange={...} />
          <Checkbox label="Underline" checked={underline} onChange={...} />
        </CheckboxGroup>
        <Select label="Font Family" options={fonts} value={fontFamily} />
        <NumberInput label="Font Size" value={fontSize} min={8} max={72} />
        <Select label="Align" options={['left', 'center', 'right']} />
      </PropertySection>
    )}
    
    {/* Style Properties */}
    <PropertySection title="Style">
      <ColorInput label="Stroke" value={strokeColor} onChange={...} />
      <ColorInput label="Fill" value={fillColor} onChange={...} />
      <NumberInput label="Line Width" value={lineWidth} min={1} max={20} />
      <Checkbox label="Dashed" checked={isDashed} onChange={...} />
      <Checkbox label="Arrow" checked={hasArrow} onChange={...} />
    </PropertySection>
    
    {/* Actions */}
    <div className="mt-6 space-y-2">
      <button onClick={duplicateElement}>Duplicate</button>
      <button onClick={deleteElement} className="text-red-600">Delete</button>
    </div>
  </aside>
)}
```

### Property Updates
```javascript
function updateElementProperty(id, property, value) {
  setElements(prev => prev.map(el => 
    el.id === id ? { ...el, [property]: value, modified: Date.now() } : el
  ));
}

// Usage
<input 
  value={selectedElement.fontSize} 
  onChange={(e) => updateElementProperty(selectedId, 'fontSize', Number(e.target.value))}
/>
```

---

## Phase 4: Grid Overlay

### Grid Rendering
```javascript
function drawGrid(ctx, canvas) {
  if (!showGrid) return;
  
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  
  const gridSize = 20 * zoom;
  const offsetX = pan.x % gridSize;
  const offsetY = pan.y % gridSize;
  
  // Vertical lines
  for (let x = offsetX; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = offsetY; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  ctx.restore();
}
```

### Snap to Grid
```javascript
function snapToGrid(x, y, gridSize = 20) {
  if (!snapEnabled) return {x, y};
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}
```

---

## Phase 5: Zoom & Pan

### Zoom Controls
```javascript
function handleZoom(delta) {
  setZoom(prev => {
    const newZoom = prev * (1 + delta * 0.1);
    return Math.max(0.1, Math.min(5, newZoom)); // Clamp 10%-500%
  });
}

// Mouse wheel
function handleWheel(e) {
  e.preventDefault();
  if (e.ctrlKey || e.metaKey) {
    handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
  }
}

// Zoom buttons
<button onClick={() => handleZoom(0.1)}>+</button>
<button onClick={() => handleZoom(-0.1)}>−</button>
<span>{Math.round(zoom * 100)}%</span>
```

### Pan (Drag Canvas)
```javascript
function handlePan(e) {
  if (e.button === 1 || (e.button === 0 && e.spaceKey)) { // Middle click or Space+drag
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }
}

function handlePanMove(e) {
  if (isPanning) {
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  }
}
```

### Transform Coordinates
```javascript
function screenToCanvas(screenX, screenY) {
  const rect = canvas.getBoundingClientRect();
  const x = (screenX - rect.left - pan.x) / zoom;
  const y = (screenY - rect.top - pan.y) / zoom;
  return {x, y};
}

function canvasToScreen(canvasX, canvasY) {
  return {
    x: canvasX * zoom + pan.x,
    y: canvasY * zoom + pan.y
  };
}
```

### Render with Transform
```javascript
function render() {
  const ctx = canvas.getContext('2d');
  
  // Clear
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Apply transform
  ctx.save();
  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);
  
  // Draw grid
  if (showGrid) drawGrid(ctx, canvas);
  
  // Draw elements
  elements.forEach(element => {
    drawElement(ctx, element, element.id === selectedId);
  });
  
  ctx.restore();
  
  // Draw UI overlays (not transformed)
  if (selectedId) {
    const elem = elements.find(e => e.id === selectedId);
    if (elem) renderSelection(ctx, elem);
  }
}
```

---

## Phase 6: Save/Load Projects

### Project Structure
```javascript
const project = {
  version: '1.0',
  name: 'My Diagram',
  created: timestamp,
  modified: timestamp,
  elements: [...elements],
  viewport: {
    zoom,
    pan,
    showGrid
  },
  settings: {
    gridSize: 20,
    snapToGrid: false
  }
};
```

### Save Project
```javascript
function saveProject() {
  const project = {
    version: '1.0',
    name: projectName,
    created: Date.now(),
    modified: Date.now(),
    elements,
    viewport: { zoom, pan, showGrid }
  };
  
  const blob = new Blob([JSON.stringify(project, null, 2)], { 
    type: 'application/json' 
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projectName}.tikz.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Load Project
```javascript
function loadProject(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const project = JSON.parse(e.target.result);
      
      // Validate version
      if (project.version !== '1.0') {
        alert('Unsupported project version');
        return;
      }
      
      // Restore state
      setProjectName(project.name);
      setElements(project.elements);
      setZoom(project.viewport.zoom || 1);
      setPan(project.viewport.pan || {x: 0, y: 0});
      setShowGrid(project.viewport.showGrid || false);
      
      // Reset selection
      setSelectedId(null);
      setShowProperties(false);
      
    } catch (err) {
      alert('Failed to load project: ' + err.message);
    }
  };
  reader.readAsText(file);
}
```

### Auto-save
```javascript
useEffect(() => {
  const timer = setInterval(() => {
    const autosave = {
      name: projectName,
      elements,
      timestamp: Date.now()
    };
    localStorage.setItem('tikz-autosave', JSON.stringify(autosave));
  }, 30000); // Every 30 seconds
  
  return () => clearInterval(timer);
}, [projectName, elements]);

// Load autosave on mount
useEffect(() => {
  const saved = localStorage.getItem('tikz-autosave');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      if (confirm(`Recover autosaved project "${data.name}"?`)) {
        setProjectName(data.name);
        setElements(data.elements);
      }
    } catch (err) {}
  }
}, []);
```

---

## Phase 7: Additional UI Components

### Toolbar Additions
```jsx
<div className="flex gap-2 items-center">
  {/* Zoom Controls */}
  <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 shadow">
    <button onClick={() => handleZoom(-0.1)}>−</button>
    <span className="text-xs font-mono w-12 text-center">
      {Math.round(zoom * 100)}%
    </span>
    <button onClick={() => handleZoom(0.1)}>+</button>
    <button onClick={() => setZoom(1)} title="Reset">⊙</button>
  </div>
  
  {/* Grid Toggle */}
  <button 
    onClick={() => setShowGrid(!showGrid)}
    className={showGrid ? 'active' : ''}
  >
    ▦ Grid
  </button>
  
  {/* Selection Tool */}
  <button 
    onClick={() => setTool('select')}
    className={tool === 'select' ? 'active' : ''}
  >
    ⬚ Select
  </button>
</div>
```

### Project Name Input
```jsx
<input 
  type="text"
  value={projectName}
  onChange={(e) => setProjectName(e.target.value)}
  className="font-bold text-lg border-none focus:outline-none"
  placeholder="Untitled"
/>
```

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Element tracking system
2. ✅ Selection system (click to select)
3. ✅ Properties panel UI
4. ✅ Property updates

### Medium Priority (UX Enhancements)
5. ✅ Grid overlay
6. ✅ Zoom controls
7. ✅ Pan functionality
8. ✅ Save/Load projects

### Low Priority (Polish)
9. ⬜ Snap to grid
10. ⬜ Resize handles
11. ⬜ Rotation handle
12. ⬜ Multi-select (Shift+Click)
13. ⬜ Copy/Paste
14. ⬜ Layers system

---

## Breaking Changes

### API Changes
- `handleUndo()` now works with elements array instead of canvas snapshots
- Mouse events need coordinate transformation for zoom/pan
- Drawing functions need to create element objects

### Performance Considerations
- Rendering 100+ elements: Use requestAnimationFrame
- Large pen strokes: Simplify point arrays
- Frequent property updates: Debounce renders

---

## Testing Checklist

- [ ] Draw each shape type
- [ ] Select each shape type
- [ ] Edit properties of each type
- [ ] Undo/Redo with selection
- [ ] Zoom in/out
- [ ] Pan canvas
- [ ] Toggle grid
- [ ] Save project
- [ ] Load project
- [ ] Export PNG at different zoom levels
- [ ] Generate TikZ code with selected elements

---

## Estimated Implementation Time

- **Phase 1 (Foundation)**: 2-3 hours
- **Phase 2 (Selection)**: 1-2 hours
- **Phase 3 (Properties Panel)**: 2-3 hours
- **Phase 4 (Grid)**: 30 minutes
- **Phase 5 (Zoom/Pan)**: 1-2 hours
- **Phase 6 (Save/Load)**: 1 hour
- **Phase 7 (Polish)**: 1-2 hours

**Total**: 8-13 hours of focused development

---

## Next Steps

Would you like me to:
1. **Implement the full system** (will take time, create as new file)
2. **Implement phase-by-phase** (starting with element tracking)
3. **Create a minimal working example** of selection system
4. **Keep current version** and add simpler features

The current app is production-ready with 30+ tools. Adding selection is a major architectural change.
