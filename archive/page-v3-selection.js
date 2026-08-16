"use client";
import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * TikZ Generator v3.0 - With Element Selection System
 * Complete rewrite with element tracking, selection, properties panel,
 * grid overlay, zoom/pan, and save/load functionality.
 */

export default function TikzAppV3() {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Navigation & UI State
  const [activeTab, setActiveTab] = useState('design');
  const [tool, setTool] = useState('pen');
  const [showProperties, setShowProperties] = useState(false);

  // Drawing Style State
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [fillColor, setFillColor] = useState('transparent');
  const [isDashed, setIsDashed] = useState(false);
  const [hasArrow, setHasArrow] = useState(false);
  const [textLabel, setTextLabel] = useState('Label');

  // Element Management - THE KEY CHANGE
  const [elements, setElements] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const elementIdCounter = useRef(0);
  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Viewport State (Zoom & Pan)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Project Management
  const [projectName, setProjectName] = useState('Untitled Diagram');

  // Drawing State
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [tempPoints, setTempPoints] = useState([]);

  // AI Generation State
  const [tikzCode, setTikzCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Canvas References
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Color presets
  const colorPresets = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
    '#ff0088', '#00ff88', '#8888ff', '#888888', '#444444'
  ];

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const selectedElement = selectedId ? elements.find(e => e.id === selectedId) : null;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Generate unique ID for new elements
  const generateId = () => {
    elementIdCounter.current += 1;
    return `elem_${elementIdCounter.current}_${Date.now()}`;
  };

  // Transform screen coordinates to canvas coordinates (accounting for zoom/pan)
  const screenToCanvas = useCallback((screenX, screenY) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = ((screenX - rect.left) - pan.x) / zoom;
    const y = ((screenY - rect.top) - pan.y) / zoom;

    return { x, y };
  }, [zoom, pan]);

  // Get coordinates from pointer event
  const getCoordinates = useCallback((e) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    const pressure = e.pressure ?? 0.5;

    const { x, y } = screenToCanvas(clientX, clientY);
    return { x, y, pressure };
  }, [screenToCanvas]);

  // ============================================================================
  // ELEMENT BOUNDS CALCULATION
  // ============================================================================

  const getElementBounds = (element) => {
    let bounds = { x: 0, y: 0, width: 0, height: 0 };

    switch (element.type) {
      case 'rect':
      case 'parallelogram':
      case 'rhombus':
        bounds = {
          x: Math.min(element.x, element.x + element.width),
          y: Math.min(element.y, element.y + element.height),
          width: Math.abs(element.width),
          height: Math.abs(element.height)
        };
        break;

      case 'circle':
      case 'pentagon':
      case 'hexagon':
      case 'star':
      case 'voltmeter':
      case 'ammeter':
        bounds = {
          x: element.x - element.radius,
          y: element.y - element.radius,
          width: element.radius * 2,
          height: element.radius * 2
        };
        break;

      case 'ellipse':
        bounds = {
          x: element.x - Math.abs(element.radiusX),
          y: element.y - Math.abs(element.radiusY),
          width: Math.abs(element.radiusX) * 2,
          height: Math.abs(element.radiusY) * 2
        };
        break;

      case 'triangle':
        const xs = [element.x1, element.x2, element.x3];
        const ys = [element.y1, element.y2, element.y3];
        bounds = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          width: Math.max(...xs) - Math.min(...xs),
          height: Math.max(...ys) - Math.min(...ys)
        };
        break;

      case 'line':
      case 'resistor':
      case 'capacitor':
      case 'inductor':
      case 'battery':
      case 'diode':
      case 'sine':
        bounds = {
          x: Math.min(element.startX, element.endX),
          y: Math.min(element.startY, element.endY),
          width: Math.abs(element.endX - element.startX),
          height: Math.abs(element.endY - element.startY)
        };
        break;

      case 'pen':
        if (element.points && element.points.length > 0) {
          const xs = element.points.map(p => p.x);
          const ys = element.points.map(p => p.y);
          bounds = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
          };
        }
        break;

      case 'text':
        // Estimate text bounds (rough approximation)
        const fontSize = element.fontSize || 16;
        const textWidth = (element.text?.length || 5) * fontSize * 0.6;
        bounds = {
          x: element.x,
          y: element.y - fontSize,
          width: textWidth,
          height: fontSize * 1.2
        };
        break;

      case 'and-gate':
      case 'or-gate':
      case 'not-gate':
      case 'nand-gate':
      case 'nor-gate':
      case 'xor-gate':
        bounds = {
          x: Math.min(element.x, element.x + element.width),
          y: Math.min(element.y, element.y + element.height),
          width: Math.abs(element.width),
          height: Math.abs(element.height)
        };
        break;

      case 'ground':
        bounds = {
          x: element.x - 15,
          y: element.y,
          width: 30,
          height: 30
        };
        break;
    }

    // Add padding for selection box
    return {
      x: bounds.x - 5,
      y: bounds.y - 5,
      width: bounds.width + 10,
      height: bounds.height + 10
    };
  };

  // ============================================================================
  // HIT DETECTION - Check if point is inside element
  // ============================================================================

  const isPointInElement = (x, y, element) => {
    const bounds = getElementBounds(element);

    // Simple bounding box check for most elements
    const inBounds = x >= bounds.x && x <= bounds.x + bounds.width &&
                     y >= bounds.y && y <= bounds.y + bounds.height;

    if (!inBounds) return false;

    // More precise checks for specific shapes
    switch (element.type) {
      case 'circle':
      case 'voltmeter':
      case 'ammeter':
        const dist = Math.sqrt((x - element.x) ** 2 + (y - element.y) ** 2);
        return dist <= element.radius + 5;

      case 'ellipse':
        const dx = (x - element.x) / element.radiusX;
        const dy = (y - element.y) / element.radiusY;
        return (dx * dx + dy * dy) <= 1.1;

      default:
        return inBounds;
    }
  };

  // Find element at given point (returns topmost element)
  const getElementAtPoint = (x, y) => {
    // Iterate from end to start (top to bottom in render order)
    for (let i = elements.length - 1; i >= 0; i--) {
      if (isPointInElement(x, y, elements[i])) {
        return elements[i].id;
      }
    }
    return null;
  };

  // Continue in next chunk...
