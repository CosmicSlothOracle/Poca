import React, { useEffect, useRef, useState } from "react";
import { LAYOUT } from "../ui/layout";

interface Slot {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  locked: boolean;
  clickZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface CanvasConfig {
  width: number;
  height: number;
  grid: number;
}

interface LayoutData {
  canvas: CanvasConfig;
  background?: { src: string };
  slots: Slot[];
}

const typeColor: Record<string, string> = {
  government: "#4ade80",
  public: "#60a5fa",
  dauerhaft: "#f59e0b",
  sofort: "#f472b6",
  hand: "#a78bfa",
  other: "#a78bfa",
};

const uid = () => Math.random().toString(36).slice(2, 9);

// Convert current LAYOUT to editor format
const convertLayoutToEditorFormat = (): LayoutData => {
  const slots: Slot[] = [];

  LAYOUT.zones.forEach(zone => {
    if (zone.layout?.type === 'fixedSlots') {
      const [x, y, w, h] = zone.rectPx;
      const lay = zone.layout as any;
      const slotCount = lay.slots;
      const slotSize = lay.slotSize;
      const gap = lay.gap;
      const direction = lay.direction ?? 'row';

      for (let i = 0; i < slotCount; i++) {
        let slotX = x;
        let slotY = y;

        if (direction === 'horizontal') {
          slotX = x + i * (slotSize[0] + gap);
        } else if (direction === 'vertical') {
          slotY = y + i * (slotSize[1] + gap);
        } else if (direction === 'vertical-reverse') {
          slotY = y + (slotCount - 1 - i) * (slotSize[1] + gap);
        }

        const slotId = `${zone.id}-${i}`;
        const slotType = getSlotType(zone.id);

        slots.push({
          id: slotId,
          name: slotId,
          type: slotType,
          x: slotX,
          y: slotY,
          width: slotSize[0],
          height: slotSize[1],
          color: typeColor[slotType],
          locked: false,
          clickZone: {
            x: slotX,
            y: slotY,
            width: slotSize[0],
            height: slotSize[1]
          }
        });
      }
    } else if (zone.layout?.type === 'singleSlot') {
      const [x, y, w, h] = zone.rectPx;
      const slotType = getSlotType(zone.id);

      slots.push({
        id: zone.id,
        name: zone.id,
        type: slotType,
        x: x,
        y: y,
        width: w,
        height: h,
        color: typeColor[slotType],
        locked: false,
        clickZone: {
          x: x,
          y: y,
          width: w,
          height: h
        }
      });
    }
  });

  return {
    canvas: {
      width: 1920,
      height: 1080,
      grid: 13
    },
    slots
  };
};

const getSlotType = (zoneId: string): string => {
  if (zoneId.includes('government')) return 'government';
  if (zoneId.includes('public')) return 'public';
  if (zoneId.includes('permanent')) return 'dauerhaft';
  if (zoneId.includes('instant')) return 'sofort';
  if (zoneId.includes('interventions')) return 'sofort';
  if (zoneId.includes('hand')) return 'hand';
  return 'other';
};

const getTypeColor = (type: string): string => {
  return typeColor[type] || typeColor.other;
};

const defaultLayout: LayoutData = convertLayoutToEditorFormat();

const UILayoutEditor: React.FC = () => {
  const [layout, setLayout] = useState<LayoutData>(defaultLayout);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [showClickZone, setShowClickZone] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [editMode, setEditMode] = useState<'position' | 'clickzone'>('position');
  const [zoom, setZoom] = useState(0.5);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const addSlot = (type: string) => {
    const newSlot: Slot = {
      id: uid(),
      name: `New ${type}`,
      type,
      x: 100,
      y: 100,
      width: 256,
      height: 256,
      color: typeColor[type],
      locked: false,
      clickZone: {
        x: 100,
        y: 100,
        width: 256,
        height: 256
      }
    };
    setLayout(prev => ({ ...prev, slots: [...prev.slots, newSlot] }));
  };

  const deleteSlot = (id: string) => {
    setLayout(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) }));
    if (selected?.id === id) setSelected(null);
  };

  const updateSlot = (id: string, updates: Partial<Slot>) => {
    setLayout(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const exportGameFormat = () => {
    const zones: any[] = [];
    const slotGroups: Record<string, Slot[]> = {};

    // Group slots by their base ID
    layout.slots.forEach(slot => {
      const baseId = slot.id.split('-')[0];
      if (!slotGroups[baseId]) slotGroups[baseId] = [];
      slotGroups[baseId].push(slot);
    });

    // Convert groups to zones
    Object.entries(slotGroups).forEach(([baseId, slots]) => {
      if (slots.length === 1) {
        // Single slot
        const slot = slots[0];
        zones.push({
          id: baseId,
          rectPx: [slot.x, slot.y, slot.width, slot.height],
          layout: {
            type: "singleSlot",
            slotSize: [slot.width, slot.height]
          },
          z: 10
        });
      } else {
        // Multiple slots - determine layout type
        const firstSlot = slots[0];
        const isHorizontal = slots.every(s => s.y === firstSlot.y);
        const isVertical = slots.every(s => s.x === firstSlot.x);

        if (isHorizontal) {
          const minX = Math.min(...slots.map(s => s.x));
          const maxX = Math.max(...slots.map(s => s.x + s.width));
          const y = firstSlot.y;
          const width = maxX - minX;
          const height = firstSlot.height;

          zones.push({
            id: baseId,
            rectPx: [minX, y, width, height],
            layout: {
              type: "fixedSlots",
              slots: slots.length,
              slotSize: [firstSlot.width, firstSlot.height],
              gap: slots.length > 1 ? slots[1].x - (slots[0].x + slots[0].width) : 8,
              alignment: "left",
              direction: "horizontal"
            },
            z: 10
          });
        } else if (isVertical) {
          const minY = Math.min(...slots.map(s => s.y));
          const maxY = Math.max(...slots.map(s => s.y + s.height));
          const x = firstSlot.x;
          const width = firstSlot.width;
          const height = maxY - minY;

          zones.push({
            id: baseId,
            rectPx: [x, minY, width, height],
            layout: {
              type: "fixedSlots",
              slots: slots.length,
              slotSize: [firstSlot.width, firstSlot.height],
              gap: slots.length > 1 ? slots[1].y - (slots[0].y + slots[0].height) : 8,
              alignment: "left",
              direction: "vertical"
            },
            z: 10
          });
        }
      }
    });

    const exportData = {
      version: 4,
      canvas: {
        width: layout.canvas.width,
        height: layout.canvas.height,
        aspect: "16:9"
      },
      scaling: {
        mode: "fit",
        letterbox: true
      },
      zones
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ui_layout_1920x1080.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    exportCanvas.width = layout.canvas.width;
    exportCanvas.height = layout.canvas.height;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let x = 0; x <= exportCanvas.width; x += layout.canvas.grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, exportCanvas.height);
        ctx.stroke();
      }
      for (let y = 0; y <= exportCanvas.height; y += layout.canvas.grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(exportCanvas.width, y);
        ctx.stroke();
      }
    }

    // Draw slots
    layout.slots.forEach(slot => {
      // Draw slot rectangle
      ctx.fillStyle = slot.color + '40'; // Add transparency
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
      ctx.strokeStyle = slot.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

      // Draw slot name
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(slot.name, slot.x + slot.width / 2, slot.y + slot.height / 2);

      // Draw click zone if different from slot
      if (slot.clickZone && (slot.clickZone.x !== slot.x || slot.clickZone.y !== slot.y ||
          slot.clickZone.width !== slot.width || slot.clickZone.height !== slot.height)) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(slot.clickZone.x, slot.clickZone.y, slot.clickZone.width, slot.clickZone.height);
        ctx.setLineDash([]);
      }
    });

    // Export as PNG
    const dataURL = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = 'ui_layout_export.png';
    link.click();
  };

  const importBackground = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          setLayout(prev => ({
            ...prev,
            background: { src }
          }));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const exportJSON = () => {
    const dataStr = JSON.stringify(layout, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ui_layout_editor.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedLayout = JSON.parse(e.target?.result as string);
            setLayout(importedLayout);
          } catch (error) {
            alert('Error importing JSON file: ' + error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const clickedSlot = layout.slots.find(slot =>
      x >= slot.x && x <= slot.x + slot.width &&
      y >= slot.y && y <= slot.y + slot.height
    );

    if (clickedSlot) {
      setSelected(clickedSlot);
      isDragging.current = true;
      dragStart.current = { x: x - clickedSlot.x, y: y - clickedSlot.y };
    } else {
      setSelected(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !selected) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    const newX = Math.round((x - dragStart.current.x) / layout.canvas.grid) * layout.canvas.grid;
    const newY = Math.round((y - dragStart.current.y) / layout.canvas.grid) * layout.canvas.grid;

    if (editMode === 'position') {
      updateSlot(selected.id, { x: newX, y: newY });
      if (selected.clickZone) {
        updateSlot(selected.id, {
          clickZone: { ...selected.clickZone, x: newX, y: newY }
        });
      }
    } else if (editMode === 'clickzone' && selected.clickZone) {
      updateSlot(selected.id, {
        clickZone: { ...selected.clickZone, x: newX, y: newY }
      });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);

    // Draw background image if available
    if (layout.background?.src) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, layout.canvas.width, layout.canvas.height);
        // Continue drawing on top of background
        drawGridAndSlots(ctx);
      };
      img.src = layout.background.src;
      return; // Exit early, will continue in onload
    }

    // If no background, draw directly
    drawGridAndSlots(ctx);
  };

  const drawGridAndSlots = (ctx: CanvasRenderingContext2D) => {
    // Draw grid if enabled
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let x = 0; x < layout.canvas.width; x += layout.canvas.grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, layout.canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < layout.canvas.height; y += layout.canvas.grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(layout.canvas.width, y);
        ctx.stroke();
      }
    }

    // Draw slots
    layout.slots.forEach(slot => {
      const isSelected = selected?.id === slot.id;

      // Draw main slot
      ctx.fillStyle = slot.color + '40';
      ctx.fillRect(slot.x, slot.y, slot.width, slot.height);
      ctx.strokeStyle = isSelected ? '#ef4444' : slot.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.strokeRect(slot.x, slot.y, slot.width, slot.height);

      // Draw click zone if enabled
      if (showClickZone && slot.clickZone) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(slot.clickZone.x, slot.clickZone.y, slot.clickZone.width, slot.clickZone.height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(slot.clickZone.x, slot.clickZone.y, slot.clickZone.width, slot.clickZone.height);
        ctx.setLineDash([]);
      }

      // Draw label
      ctx.fillStyle = '#000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(slot.name, slot.x + slot.width / 2, slot.y + slot.height / 2);
    });

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [layout, selected, showClickZone, showGrid, zoom]);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>UI Layout Editor</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("government")}
        >
          + Government
        </button>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("public")}
        >
          + Public
        </button>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("dauerhaft")}
        >
          + Dauerhaft
        </button>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("sofort")}
        >
          + Sofort
        </button>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("hand")}
        >
          + Hand
        </button>
        <button
          style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
          onMouseOut={(e) => e.currentTarget.style.background = "white"}
          onClick={() => addSlot("other")}
        >
          + Other
        </button>

        <div style={{ marginLeft: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={showClickZone}
              onChange={(e) => setShowClickZone(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Show Click Zones
          </label>
        </div>

        <div style={{ marginLeft: '20px' }}>
          <label>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Show Grid
          </label>
        </div>

        <div style={{ marginLeft: '20px' }}>
          <label>
            Edit Mode:
            <select
              value={editMode}
              onChange={(e) => setEditMode(e.target.value as 'position' | 'clickzone')}
              style={{ marginLeft: '5px', border: "1px solid #d1d5db", padding: "2px 4px", borderRadius: "4px" }}
            >
              <option value="position">Position</option>
              <option value="clickzone">Click Zone</option>
            </select>
          </label>
        </div>

        <div style={{ marginLeft: '20px' }}>
          <label>
            Zoom:
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ marginLeft: '5px', width: '100px' }}
            />
            {Math.round(zoom * 100)}%
          </label>
        </div>

        <button
          style={{ marginLeft: '20px', border: "1px solid #10b981", padding: "4px 12px", borderRadius: "4px", background: "#10b981", color: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#059669"}
          onMouseOut={(e) => e.currentTarget.style.background = "#10b981"}
          onClick={exportGameFormat}
        >
          Export Game Format
        </button>

        <button
          style={{ marginLeft: '10px', border: "1px solid #3b82f6", padding: "4px 12px", borderRadius: "4px", background: "#3b82f6", color: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
          onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
          onClick={exportPNG}
        >
          Export PNG
        </button>

        <button
          style={{ marginLeft: '10px', border: "1px solid #8b5cf6", padding: "4px 12px", borderRadius: "4px", background: "#8b5cf6", color: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#7c3aed"}
          onMouseOut={(e) => e.currentTarget.style.background = "#8b5cf6"}
          onClick={exportJSON}
        >
          Export JSON
        </button>

        <button
          style={{ marginLeft: '10px', border: "1px solid #f59e0b", padding: "4px 12px", borderRadius: "4px", background: "#f59e0b", color: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#d97706"}
          onMouseOut={(e) => e.currentTarget.style.background = "#f59e0b"}
          onClick={importJSON}
        >
          Import JSON
        </button>

        <button
          style={{ marginLeft: '10px', border: "1px solid #06b6d4", padding: "4px 12px", borderRadius: "4px", background: "#06b6d4", color: "white", cursor: "pointer" }}
          onMouseOver={(e) => e.currentTarget.style.background = "#0891b2"}
          onMouseOut={(e) => e.currentTarget.style.background = "#06b6d4"}
          onClick={importBackground}
        >
          Import Background
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <canvas
            ref={canvasRef}
            width={layout.canvas.width * zoom}
            height={layout.canvas.height * zoom}
            style={{ border: '1px solid #d1d5db', cursor: 'move' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {selected && (
          <div style={{ width: '300px', padding: '20px', border: '1px solid #d1d5db', borderRadius: '4px' }}>
            <h3>Selected Slot</h3>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Name:
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) => updateSlot(selected.id, { name: e.target.value })}
                  style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Type:
                <select
                  style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                  value={selected.type}
                  onChange={(e) => updateSlot(selected.id, { type: e.target.value, color: typeColor[e.target.value] })}
                >
                  <option value="government">government</option>
                  <option value="public">public</option>
                  <option value="dauerhaft">dauerhaft</option>
                  <option value="sofort">sofort</option>
                  <option value="hand">hand</option>
                  <option value="other">other</option>
                </select>
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                X:
                <input
                  type="number"
                  value={selected.x}
                  onChange={(e) => updateSlot(selected.id, { x: parseInt(e.target.value) })}
                  style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Y:
                <input
                  type="number"
                  value={selected.y}
                  onChange={(e) => updateSlot(selected.id, { y: parseInt(e.target.value) })}
                  style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Width:
                <input
                  type="number"
                  value={selected.width}
                  onChange={(e) => updateSlot(selected.id, { width: parseInt(e.target.value) })}
                  style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                />
              </label>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label>
                Height:
                <input
                  type="number"
                  value={selected.height}
                  onChange={(e) => updateSlot(selected.id, { height: parseInt(e.target.value) })}
                  style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                />
              </label>
            </div>

            {selected.clickZone && (
              <>
                <h4>Click Zone</h4>
                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Click X:
                    <input
                      type="number"
                      value={selected.clickZone.x}
                      onChange={(e) => updateSlot(selected.id, { clickZone: { ...selected.clickZone!, x: parseInt(e.target.value) } })}
                      style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Click Y:
                    <input
                      type="number"
                      value={selected.clickZone.y}
                      onChange={(e) => updateSlot(selected.id, { clickZone: { ...selected.clickZone!, y: parseInt(e.target.value) } })}
                      style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Click Width:
                    <input
                      type="number"
                      value={selected.clickZone.width}
                      onChange={(e) => updateSlot(selected.id, { clickZone: { ...selected.clickZone!, width: parseInt(e.target.value) } })}
                      style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Click Height:
                    <input
                      type="number"
                      value={selected.clickZone.height}
                      onChange={(e) => updateSlot(selected.id, { clickZone: { ...selected.clickZone!, height: parseInt(e.target.value) } })}
                      style={{ width: '100%', border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    />
                  </label>
                </div>
              </>
            )}

            <button
              style={{ border: "1px solid #ef4444", padding: "4px 12px", borderRadius: "4px", background: "#ef4444", color: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#dc2626"}
              onMouseOut={(e) => e.currentTarget.style.background = "#ef4444"}
              onClick={() => deleteSlot(selected.id)}
            >
              Delete Slot
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UILayoutEditor;
