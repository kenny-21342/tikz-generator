"use client";
import { useRef, useState, useEffect } from 'react';

export default function TikzApp() {
  // Navigation & Primary System State
  const [activeTab, setActiveTab] = useState('design');
  const [tool, setTool] = useState('pen');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [textLabel, setTextLabel] = useState('Label');

  // Style Modifiers
  const [isDashed, setIsDashed] = useState(false);
  const [hasArrow, setHasArrow] = useState(false);
  const [fillColor, setFillColor] = useState('transparent');

  // Core Pipeline State
  const [tikzCode, setTikzCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Canvas & Undo History References
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const snapshotRef = useRef(null);
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('tikz-last-code');
    if (saved) setTikzCode(saved);
  }, []);

  // Save code to localStorage whenever it changes
  useEffect(() => {
    if (tikzCode) localStorage.setItem('tikz-last-code', tikzCode);
  }, [tikzCode]);

  // Handle dynamic canvas resizing safely
  useEffect(() => {
    if (activeTab !== 'design') return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let tempImage = null;
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;

      try {
        if (oldWidth > 0 && oldHeight > 0) {
          tempImage = ctx.getImageData(0, 0, oldWidth, oldHeight);
        }
      } catch (err) {}

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      // Apply initial styling parameters
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeColor;
      applyLineStyles(ctx);

      if (tempImage) {
        ctx.putImageData(tempImage, 0, 0);
      } else {
        saveHistoryState(ctx, canvas);
      }
    };

    const timer = setTimeout(resizeCanvas, 100);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [activeTab, lineWidth, strokeColor]);

  // Actively sync context stroke configuration changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      applyLineStyles(ctx);
    }
  }, [strokeColor, isDashed, lineWidth]);

  const applyLineStyles = (ctx) => {
    if (isDashed) {
      ctx.setLineDash([8, 8]);
    } else {
      ctx.setLineDash([]);
    }
  };

  const saveHistoryState = (ctx, canvas) => {
    try {
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(currentFrame);
      if (historyRef.current.length > 30) historyRef.current.shift();
      redoStackRef.current = []; // Clear redo stack on new action
      setCanUndo(historyRef.current.length > 1);
      setCanRedo(false);
    } catch (err) {}
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const current = historyRef.current.pop();
    redoStackRef.current.push(current);
    const previousFrame = historyRef.current[historyRef.current.length - 1];

    ctx.putImageData(previousFrame, 0, 0);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const frame = redoStackRef.current.pop();
    historyRef.current.push(frame);

    ctx.putImageData(frame, 0, 0);
    setCanUndo(historyRef.current.length > 1);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Handle both mouse and touch events
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
      pressure: e.pressure ?? 0.5
    };
  };

  const drawArrowhead = (ctx, fromX, fromY, toX, toY) => {
    const headLength = 16;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = strokeColor;
    ctx.fill();
  };

  const drawResistor = (ctx, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();

    ctx.moveTo(0, 0);
    ctx.lineTo(distance * 0.25, 0);

    const segments = 6;
    const startX = distance * 0.25;
    const endX = distance * 0.75;
    const step = (endX - startX) / segments;
    const amplitude = 18;

    for (let i = 0; i < segments; i++) {
      const currX = startX + step * i + step / 2;
      const currY = i % 2 === 0 ? -amplitude : amplitude;
      ctx.lineTo(currX, currY);
    }

    ctx.lineTo(endX, 0);
    ctx.lineTo(distance, 0);
    ctx.stroke();
    ctx.restore();
  };

  const drawCapacitor = (ctx, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();

    const plateHeight = 24;
    const gap = 8;
    const midpoint = distance / 2;

    ctx.moveTo(0, 0);
    ctx.lineTo(midpoint - gap / 2, 0);
    ctx.moveTo(midpoint - gap / 2, -plateHeight / 2);
    ctx.lineTo(midpoint - gap / 2, plateHeight / 2);
    ctx.moveTo(midpoint + gap / 2, -plateHeight / 2);
    ctx.lineTo(midpoint + gap / 2, plateHeight / 2);
    ctx.moveTo(midpoint + gap / 2, 0);
    ctx.lineTo(distance, 0);
    ctx.stroke();
    ctx.restore();
  };

  const drawInductor = (ctx, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();

    const coils = 4;
    const coilWidth = distance * 0.5 / coils;
    const amplitude = 12;

    ctx.moveTo(0, 0);
    ctx.lineTo(distance * 0.25, 0);

    const startX = distance * 0.25;
    for (let i = 0; i < coils; i++) {
      const x = startX + i * coilWidth;
      ctx.arc(x + coilWidth / 2, 0, coilWidth / 2, Math.PI, 0, false);
    }

    ctx.lineTo(distance, 0);
    ctx.stroke();
    ctx.restore();
  };

  const drawSineGraph = (ctx, x1, y1, x2, y2) => {
    const width = x2 - x1;
    const heightRange = y2 - y1;
    const midY = y1 + heightRange / 2;
    const amplitude = Math.abs(heightRange / 2) || 30;

    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y1);
    ctx.stroke();

    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeColor;
    applyLineStyles(ctx);

    const steps = Math.abs(width);
    for (let i = 0; i <= steps; i += 2) {
      const currentX = x1 + (width >= 0 ? i : -i);
      const radians = (i / Math.max(1, Math.abs(width))) * Math.PI * 4;
      const currentY = y1 - Math.sin(radians) * amplitude;

      if (i === 0) ctx.moveTo(currentX, currentY);
      else ctx.lineTo(currentX, currentY);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Additional Shapes
  const drawEllipse = (ctx, cx, cy, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, 2 * Math.PI);
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawParallelogram = (ctx, x, y, width, height) => {
    ctx.beginPath();
    const skew = width * 0.2;
    ctx.moveTo(x + skew, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - skew, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawRhombus = (ctx, x, y, width, height) => {
    ctx.beginPath();
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.moveTo(cx, y);
    ctx.lineTo(x + width, cy);
    ctx.lineTo(cx, y + height);
    ctx.lineTo(x, cy);
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawPentagon = (ctx, cx, cy, radius) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawHexagon = (ctx, cx, cy, radius) => {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 2 * Math.PI / 6);
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawStar = (ctx, cx, cy, outerRadius, innerRadius) => {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI / 5) - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  // Additional Circuit Components
  const drawBattery = (ctx, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();

    ctx.moveTo(0, 0);
    ctx.lineTo(distance * 0.4, 0);

    // Long plate
    ctx.moveTo(distance * 0.4, -15);
    ctx.lineTo(distance * 0.4, 15);

    // Short plate
    ctx.moveTo(distance * 0.6, -8);
    ctx.lineTo(distance * 0.6, 8);

    ctx.moveTo(distance * 0.6, 0);
    ctx.lineTo(distance, 0);

    ctx.stroke();
    ctx.restore();
  };

  const drawDiode = (ctx, x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(x1, y1);
    ctx.rotate(angle);
    ctx.beginPath();

    ctx.moveTo(0, 0);
    ctx.lineTo(distance * 0.3, 0);

    // Triangle
    ctx.moveTo(distance * 0.3, -12);
    ctx.lineTo(distance * 0.7, 0);
    ctx.lineTo(distance * 0.3, 12);
    ctx.closePath();
    ctx.stroke();

    // Line
    ctx.beginPath();
    ctx.moveTo(distance * 0.7, -12);
    ctx.lineTo(distance * 0.7, 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(distance * 0.7, 0);
    ctx.lineTo(distance, 0);
    ctx.stroke();

    ctx.restore();
  };

  const drawVoltmeter = (ctx, cx, cy, radius) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('V', cx, cy);
  };

  const drawAmmeter = (ctx, cx, cy, radius) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = strokeColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('A', cx, cy);
  };

  const drawGround = (ctx, x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 20);
    ctx.moveTo(x - 15, y + 20);
    ctx.lineTo(x + 15, y + 20);
    ctx.moveTo(x - 10, y + 25);
    ctx.lineTo(x + 10, y + 25);
    ctx.moveTo(x - 5, y + 30);
    ctx.lineTo(x + 5, y + 30);
    ctx.stroke();
  };

  // Logic Gates
  const drawAndGate = (ctx, x, y, width, height) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width * 0.5, y);
    ctx.arc(x + width * 0.5, y + height / 2, height / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawOrGate = (ctx, x, y, width, height) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + width * 0.6, y, x + width, y + height / 2);
    ctx.quadraticCurveTo(x + width * 0.6, y + height, x, y + height);
    ctx.quadraticCurveTo(x + width * 0.2, y + height / 2, x, y);
    ctx.stroke();
    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawNotGate = (ctx, x, y, width, height) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width * 0.8, y + height / 2);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + width * 0.9, y + height / 2, width * 0.1, 0, 2 * Math.PI);
    ctx.stroke();

    if (fillColor !== 'transparent') {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  };

  const drawNandGate = (ctx, x, y, width, height) => {
    drawAndGate(ctx, x, y, width * 0.85, height);
    ctx.beginPath();
    ctx.arc(x + width * 0.93, y + height / 2, width * 0.07, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawNorGate = (ctx, x, y, width, height) => {
    drawOrGate(ctx, x, y, width * 0.85, height);
    ctx.beginPath();
    ctx.arc(x + width * 0.93, y + height / 2, width * 0.07, 0, 2 * Math.PI);
    ctx.stroke();
  };

  const drawXorGate = (ctx, x, y, width, height) => {
    // Extra arc on the left
    ctx.beginPath();
    ctx.moveTo(x - width * 0.1, y);
    ctx.quadraticCurveTo(x + width * 0.1, y + height / 2, x - width * 0.1, y + height);
    ctx.stroke();

    drawOrGate(ctx, x, y, width, height);
  };

  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { x, y, pressure } = getCoordinates(e);

    setIsDrawing(true);
    setStartPos({ x, y });

    try {
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {}

    if (tool === 'text') {
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = strokeColor;
      ctx.fillText(textLabel, x, y);
      setIsDrawing(false);
      saveHistoryState(ctx, canvas);
      return;
    }

    // Apply pressure-sensitive line width for pen tool with Apple Pencil
    if (tool === 'pen' && pressure > 0) {
      ctx.lineWidth = lineWidth * (0.5 + pressure);
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { x, y, pressure } = getCoordinates(e);

    if (tool !== 'pen' && snapshotRef.current) {
      ctx.putImageData(snapshotRef.current, 0, 0);
      ctx.beginPath();
      applyLineStyles(ctx);
    }

    // Apply pressure sensitivity for Apple Pencil
    if (tool === 'pen' && pressure > 0) {
      ctx.lineWidth = lineWidth * (0.5 + pressure);
    }

    if (tool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (tool === 'line') {
      if (hasArrow) {
        drawArrowhead(ctx, startPos.x, startPos.y, x, y);
      } else {
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fillRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
      }
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    } else if (tool === 'triangle') {
      const height = y - startPos.y;
      const width = x - startPos.x;
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(startPos.x + width, startPos.y + height);
      ctx.lineTo(startPos.x - width / 2, startPos.y + height);
      ctx.closePath();
      ctx.stroke();
      if (fillColor !== 'transparent') {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
    } else if (tool === 'resistor') {
      drawResistor(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'capacitor') {
      drawCapacitor(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'inductor') {
      drawInductor(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'sine') {
      drawSineGraph(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'ellipse') {
      const rx = Math.abs(x - startPos.x);
      const ry = Math.abs(y - startPos.y);
      drawEllipse(ctx, startPos.x, startPos.y, rx, ry);
    } else if (tool === 'parallelogram') {
      drawParallelogram(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'rhombus') {
      drawRhombus(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'pentagon') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      drawPentagon(ctx, startPos.x, startPos.y, radius);
    } else if (tool === 'hexagon') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      drawHexagon(ctx, startPos.x, startPos.y, radius);
    } else if (tool === 'star') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      drawStar(ctx, startPos.x, startPos.y, radius, radius * 0.4);
    } else if (tool === 'battery') {
      drawBattery(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'diode') {
      drawDiode(ctx, startPos.x, startPos.y, x, y);
    } else if (tool === 'voltmeter') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      drawVoltmeter(ctx, startPos.x, startPos.y, radius);
    } else if (tool === 'ammeter') {
      const radius = Math.sqrt(Math.pow(startPos.x - x, 2) + Math.pow(startPos.y - y, 2));
      drawAmmeter(ctx, startPos.x, startPos.y, radius);
    } else if (tool === 'ground') {
      drawGround(ctx, x, y);
    } else if (tool === 'and-gate') {
      drawAndGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'or-gate') {
      drawOrGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'not-gate') {
      drawNotGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'nand-gate') {
      drawNandGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'nor-gate') {
      drawNorGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    } else if (tool === 'xor-gate') {
      drawXorGate(ctx, startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      saveHistoryState(ctx, canvas);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveHistoryState(ctx, canvas);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        clearCanvas();
        const ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
        const shiftX = (canvas.width - img.width * ratio) / 2;
        const shiftY = (canvas.height - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, shiftX, shiftY, img.width * ratio, img.height * ratio);
        saveHistoryState(ctx, canvas);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const convertToTikz = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setLoading(true);
    setError(null);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const response = await fetch('/api/generate-tikz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await response.json();
      if (data.code) {
        setTikzCode(data.code);
        setActiveTab('preview');
      } else {
        setError(data.error || 'Failed to generate code.');
      }
    } catch (err) {
      setError('Network error occurred: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tikzCode);
      alert('Code copied to clipboard!');
    } catch (err) {
      alert('Failed to copy code.');
    }
  };

  const downloadCode = () => {
    const blob = new Blob([tikzCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" type="text/css" href="https://tikzjax.com/v1/fonts.css">
      <script src="https://tikzjax.com/v1/tikzjax.js"></script>
    </head>
    <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background:#ffffff; padding:20px;">
      ${tikzCode ? `<script type="text/tikz">${tikzCode}</script>` : '<p style="color:#94a3b8; font-family:sans-serif;">No compiled graphics available yet.</p>'}
    </body>
    </html>
  `;

  return (
    <main className="flex h-screen bg-slate-50 p-4 font-sans">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800 font-bold">×</button>
          </div>
        </div>
      )}

      {/* Left Sidebar - Tools */}
      <aside className="w-80 bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 overflow-y-auto mr-4 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-slate-800">TikZ Studio</h1>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">AI Powered</span>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('design')}
            className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition ${
              activeTab === 'design' ? 'bg-blue-500 text-white shadow' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            🎨 Draw
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex-1 py-2 px-3 rounded-md font-semibold text-sm transition ${
              activeTab === 'preview' ? 'bg-blue-500 text-white shadow' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            💻 Code
          </button>
        </div>

        {activeTab === 'design' ? (
          <>
            {/* Undo/Redo */}
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                  canUndo ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↩️ Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition ${
                  canRedo ? 'bg-slate-600 text-white hover:bg-slate-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                ↪️ Redo
              </button>
            </div>

            {/* __CONTINUE_HERE__ */}

            {/* Basic Drawing Tools */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Basic Tools</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('pen')} className={`py-2 px-3 rounded-lg text-sm font-medium transition border ${tool === 'pen' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>✏️ Pen</button>
                <button onClick={() => setTool('line')} className={`py-2 px-3 rounded-lg text-sm font-medium transition border ${tool === 'line' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>📏 Line</button>
                <button onClick={() => setTool('text')} className={`py-2 px-3 rounded-lg text-sm font-medium transition border ${tool === 'text' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🔤 Text</button>
              </div>
              {tool === 'text' && (
                <input
                  type="text"
                  value={textLabel}
                  onChange={(e) => setTextLabel(e.target.value)}
                  placeholder="Label text..."
                  className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>

            {/* Shapes */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Basic Shapes</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('rect')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'rect' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⬜ Rectangle</button>
                <button onClick={() => setTool('circle')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'circle' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⭕ Circle</button>
                <button onClick={() => setTool('triangle')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'triangle' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🔺 Triangle</button>
                <button onClick={() => setTool('ellipse')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'ellipse' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⬭ Ellipse</button>
              </div>
            </div>

            {/* Advanced Shapes */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Polygons</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('parallelogram')} className={`py-2 px-2 rounded-lg text-xs font-medium transition border ${tool === 'parallelogram' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>▱ Parallelogram</button>
                <button onClick={() => setTool('rhombus')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'rhombus' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>◇ Rhombus</button>
                <button onClick={() => setTool('pentagon')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'pentagon' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⬠ Pentagon</button>
                <button onClick={() => setTool('hexagon')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'hexagon' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⬡ Hexagon</button>
                <button onClick={() => setTool('star')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'star' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⭐ Star</button>
              </div>
            </div>

            {/* Circuit Elements */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Circuit Components</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('resistor')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'resistor' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⚡ Resistor</button>
                <button onClick={() => setTool('capacitor')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'capacitor' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🔋 Capacitor</button>
                <button onClick={() => setTool('inductor')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'inductor' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🌀 Inductor</button>
                <button onClick={() => setTool('battery')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'battery' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🔌 Battery</button>
                <button onClick={() => setTool('diode')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'diode' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>🔺 Diode</button>
                <button onClick={() => setTool('ground')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'ground' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>⏚ Ground</button>
              </div>
            </div>

            {/* Measurement Tools */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Measurement</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('voltmeter')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'voltmeter' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>Ⓥ Voltmeter</button>
                <button onClick={() => setTool('ammeter')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'ammeter' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>Ⓐ Ammeter</button>
              </div>
            </div>

            {/* Logic Gates */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logic Gates</h5>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setTool('and-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'and-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>AND</button>
                <button onClick={() => setTool('or-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'or-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>OR</button>
                <button onClick={() => setTool('not-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'not-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>NOT</button>
                <button onClick={() => setTool('nand-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'nand-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>NAND</button>
                <button onClick={() => setTool('nor-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'nor-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>NOR</button>
                <button onClick={() => setTool('xor-gate')} className={`py-2 px-3 rounded-lg text-xs font-medium transition border ${tool === 'xor-gate' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>XOR</button>
              </div>
            </div>

            {/* Math Functions */}
            <div>
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Math Plots</h5>
              <button onClick={() => setTool('sine')} className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition border text-left ${tool === 'sine' ? 'bg-blue-500 text-white border-blue-500' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}>📈 Sine Wave</button>
            </div>

            {/* Style Settings */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h5 className="text-sm font-semibold text-slate-700 mb-3">Style</h5>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={strokeColor}
                      onChange={(e) => setStrokeColor(e.target.value)}
                      className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-600">{strokeColor.toUpperCase()}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Line Width: {lineWidth}px</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDashed}
                    onChange={(e) => setIsDashed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-700">Dashed Line</span>
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasArrow}
                    onChange={(e) => setHasArrow(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-slate-700">Arrow Head</span>
                </label>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Fill Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={fillColor === 'transparent' ? '#ffffff' : fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-12 h-10 border border-slate-300 rounded cursor-pointer"
                    />
                    <button
                      onClick={() => setFillColor('transparent')}
                      className={`text-xs px-2 py-1 rounded ${fillColor === 'transparent' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'}`}
                    >
                      None
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-auto space-y-2">
              <label className="block py-2 px-4 bg-slate-100 text-slate-700 rounded-lg cursor-pointer text-center font-semibold text-sm border border-dashed border-slate-300 hover:bg-slate-200 transition">
                📥 Import Image
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              <button
                onClick={clearCanvas}
                className="w-full py-2 px-4 bg-red-50 text-red-600 rounded-lg font-semibold text-sm hover:bg-red-100 transition border border-red-200"
              >
                🗑️ Clear Canvas
              </button>
              <button
                onClick={convertToTikz}
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold text-sm hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? '⚙️ Generating...' : '✨ Generate TikZ Code'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Code Tab Actions */}
            <div className="space-y-2">
              <button
                onClick={copyToClipboard}
                disabled={!tikzCode}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg font-semibold text-sm hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📋 Copy to Clipboard
              </button>
              <button
                onClick={downloadCode}
                disabled={!tikzCode}
                className="w-full py-2 px-4 bg-purple-500 text-white rounded-lg font-semibold text-sm hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                💾 Download .tex File
              </button>
              <button
                onClick={() => setActiveTab('design')}
                className="w-full py-2 px-4 bg-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-300 transition"
              >
                ← Back to Canvas
              </button>
            </div>

            <div className="bg-slate-100 p-4 rounded-lg">
              <h5 className="text-sm font-semibold text-slate-700 mb-2">About</h5>
              <p className="text-xs text-slate-600 leading-relaxed">
                Draw diagrams on the canvas and generate LaTeX TikZ code using Claude AI. Perfect for academic papers, presentations, and circuit diagrams.
              </p>
            </div>
          </>
        )}
      </aside>

      {/* Main Canvas/Preview Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === 'design' ? (
          <div ref={containerRef} className="w-full h-full bg-white rounded-xl shadow-sm overflow-hidden relative" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="block w-full h-full cursor-crosshair"
              style={{ touchAction: 'none' }}
            />
          </div>
        ) : (
          <div className="w-full h-full flex gap-4">
            {/* Code Editor */}
            <div className="flex-1 flex flex-col bg-slate-900 rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-800 px-4 py-2 border-b border-slate-700">
                <span className="text-xs font-mono text-slate-300">diagram.tex</span>
              </div>
              <textarea
                value={tikzCode}
                onChange={(e) => setTikzCode(e.target.value)}
                placeholder="% Click 'Generate TikZ Code' on the Draw tab to create code..."
                className="flex-1 p-4 font-mono text-sm leading-relaxed bg-slate-900 text-slate-100 resize-none focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Preview */}
            <div className="flex-1 bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                <span className="text-xs font-semibold text-slate-600">Live Preview</span>
              </div>
              <iframe
                srcDoc={previewHtml}
                title="TikZ Preview"
                className="w-full h-full border-none"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
