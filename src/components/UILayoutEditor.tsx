import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportLayoutAsGameFormat } from "../utils/uiLayoutConverter";

// UI Layout Editor für das Mandate Game
// Drag, snap-to-grid, resize handles, background image, JSON import/export, PNG export

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
  other: "#a78bfa",
};

const uid = () => Math.random().toString(36).slice(2, 9);

// Default layout based on the new ui-layout.json
const defaultLayout: LayoutData = {
  canvas: {
    width: 1920,
    height: 1080,
    grid: 13
  },
  slots: [
    {
      id: "1",
      name: "government-1",
      type: "government",
      x: 16,
      y: 304,
      width: 256,
      height: 256,
      color: "#4ade80",
      locked: false
    },
    {
      id: "2",
      name: "government-2",
      type: "government",
      x: 288,
      y: 304,
      width: 256,
      height: 256,
      color: "#4ade80",
      locked: false
    },
    {
      id: "3",
      name: "government-3",
      type: "government",
      x: 560,
      y: 304,
      width: 256,
      height: 256,
      color: "#4ade80",
      locked: false
    },
    {
      id: "4",
      name: "government-4",
      type: "government",
      x: 832,
      y: 304,
      width: 256,
      height: 256,
      color: "#4ade80",
      locked: false
    },
    {
      id: "5",
      name: "government-5",
      type: "government",
      x: 1104,
      y: 304,
      width: 256,
      height: 256,
      color: "#4ade80",
      locked: false
    },
    {
      id: "6",
      name: "public-1",
      type: "public",
      x: 16,
      y: 560,
      width: 256,
      height: 256,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "7",
      name: "public-2",
      type: "public",
      x: 288,
      y: 560,
      width: 256,
      height: 256,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "8",
      name: "public-3",
      type: "public",
      x: 560,
      y: 560,
      width: 256,
      height: 256,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "9",
      name: "public-4",
      type: "public",
      x: 832,
      y: 560,
      width: 256,
      height: 256,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "10",
      name: "public-5",
      type: "public",
      x: 1104,
      y: 560,
      width: 256,
      height: 256,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "11",
      name: "dauerhaft-government",
      type: "dauerhaft",
      x: 1360,
      y: 304,
      width: 256,
      height: 256,
      color: "#f59e0b",
      locked: false
    },
    {
      id: "12",
      name: "dauerhaft-public",
      type: "dauerhaft",
      x: 1360,
      y: 560,
      width: 256,
      height: 256,
      color: "#f59e0b",
      locked: false
    },
    {
      id: "13",
      name: "sofort",
      type: "sofort",
      x: 1352,
      y: 824,
      width: 256,
      height: 256,
      color: "#f472b6",
      locked: false
    },
    {
      id: "14",
      name: "opponent-government-1",
      type: "government",
      x: 24,
      y: 168,
      width: 128,
      height: 128,
      color: "#4ade80",
      locked: false
    },
    {
      id: "15",
      name: "opponent-government-2",
      type: "government",
      x: 164,
      y: 168,
      width: 128,
      height: 128,
      color: "#4ade80",
      locked: false
    },
    {
      id: "16",
      name: "opponent-government-3",
      type: "government",
      x: 304,
      y: 168,
      width: 128,
      height: 128,
      color: "#4ade80",
      locked: false
    },
    {
      id: "17",
      name: "opponent-government-4",
      type: "government",
      x: 444,
      y: 168,
      width: 128,
      height: 128,
      color: "#4ade80",
      locked: false
    },
    {
      id: "18",
      name: "opponent-government-5",
      type: "government",
      x: 584,
      y: 168,
      width: 128,
      height: 128,
      color: "#4ade80",
      locked: false
    },
    {
      id: "19",
      name: "opponent-public-1",
      type: "public",
      x: 24,
      y: 24,
      width: 128,
      height: 128,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "20",
      name: "opponent-public-2",
      type: "public",
      x: 164,
      y: 24,
      width: 128,
      height: 128,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "21",
      name: "opponent-public-3",
      type: "public",
      x: 304,
      y: 24,
      width: 128,
      height: 128,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "22",
      name: "opponent-public-4",
      type: "public",
      x: 444,
      y: 24,
      width: 128,
      height: 128,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "23",
      name: "opponent-public-5",
      type: "public",
      x: 584,
      y: 24,
      width: 128,
      height: 128,
      color: "#60a5fa",
      locked: false
    },
    {
      id: "24",
      name: "opponent-dauerhaft-public",
      type: "dauerhaft",
      x: 715,
      y: 26,
      width: 128,
      height: 128,
      color: "#f59e0b",
      locked: false
    },
    {
      id: "25",
      name: "opponent-dauerhaft-government",
      type: "dauerhaft",
      x: 715,
      y: 169,
      width: 128,
      height: 128,
      color: "#f59e0b",
      locked: false
    },
    {
      id: "26",
      name: "opponent-sofort",
      type: "sofort",
      x: 845,
      y: 26,
      width: 256,
      height: 256,
      color: "#f472b6",
      locked: false
    },
    {
      id: "27",
      name: "hand-player",
      type: "other",
      x: 0,
      y: 824,
      width: 1339,
      height: 256,
      color: "#a78bfa",
      locked: false
    },
    {
      id: "28",
      name: "hand-opponent",
      type: "other",
      x: 1655,
      y: 0,
      width: 265,
      height: 1080,
      color: "#a78bfa",
      locked: false
    }
  ]
};

export default function UILayoutEditor() {
  const [canvasW, setCanvasW] = useState(defaultLayout.canvas.width);
  const [canvasH, setCanvasH] = useState(defaultLayout.canvas.height);
  const [grid, setGrid] = useState(defaultLayout.canvas.grid);
  const [bgSrc, setBgSrc] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>(defaultLayout.slots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(0.5); // Zoom-Faktor für bessere Darstellung

  const stageRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{ mode: string | null; id?: string; dx?: number; dy?: number; dir?: string; start?: any }>({ mode: null });

  const snap = (v: number) => Math.round(v / grid) * grid;

  // Berechne die skalierte Canvas-Größe
  const scaledCanvasW = canvasW * zoom;
  const scaledCanvasH = canvasH * zoom;

  const addSlot = (type: string) => {
    const count = slots.filter((s) => s.type === type).length + 1;
    const s: Slot = {
      id: uid(),
      name: `${type}-${count}`,
      type,
      x: snap(32 + slots.length * 12),
      y: snap(32 + slots.length * 12),
      width: snap(180),
      height: snap(250),
      color: typeColor[type] || typeColor.other,
      locked: false,
    };
    setSlots((p) => [...p, s]);
    setSelectedId(s.id);
  };

  const onStagePointerDown = (e: React.PointerEvent) => {
    if (e.target === stageRef.current) setSelectedId(null);
  };

  // --- Drag & Resize mechanics ---
  const getStageOffset = () => {
    if (!stageRef.current) return { left: 0, top: 0 };
    const rect = stageRef.current.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  };

  const beginDrag = (id: string, e: React.PointerEvent) => {
    const s = slots.find((x) => x.id === id);
    if (!s || s.locked) return;
    const { left, top } = getStageOffset();
    stateRef.current = {
      mode: "drag",
      id,
      dx: e.clientX - left - s.x * zoom,
      dy: e.clientY - top - s.y * zoom,
    };
  };

  const beginResize = (id: string, dir: string, e: React.PointerEvent) => {
    const s = slots.find((x) => x.id === id);
    if (!s || s.locked) return;
    stateRef.current = {
      mode: "resize",
      id,
      dir,
      start: { x: s.x, y: s.y, w: s.width, h: s.height, cx: e.clientX, cy: e.clientY },
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const st = stateRef.current;
      if (!st.mode) return;
      const { left, top } = getStageOffset();
      if (st.mode === "drag" && st.id) {
        const nx = snap((e.clientX - left - (st.dx || 0)) / zoom);
        const ny = snap((e.clientY - top - (st.dy || 0)) / zoom);
        setSlots((p) => p.map((x) => (x.id === st.id ? { ...x, x: Math.max(0, Math.min(nx, canvasW - x.width)), y: Math.max(0, Math.min(ny, canvasH - x.height)) } : x)));
      } else if (st.mode === "resize" && st.id && st.start) {
        const s = slots.find((x) => x.id === st.id);
        if (!s) return;
        const dx = (e.clientX - st.start.cx) / zoom;
        const dy = (e.clientY - st.start.cy) / zoom;
        let x = st.start.x;
        let y = st.start.y;
        let w = st.start.w;
        let h = st.start.h;
        const dir = st.dir || "";
        if (dir.includes("e")) w = snap(Math.max(10, st.start.w + dx));
        if (dir.includes("s")) h = snap(Math.max(10, st.start.h + dy));
        if (dir.includes("w")) {
          const nw = snap(Math.max(10, st.start.w - dx));
          x = snap(st.start.x + (st.start.w - nw));
          w = nw;
        }
        if (dir.includes("n")) {
          const nh = snap(Math.max(10, st.start.h - dy));
          y = snap(st.start.y + (st.start.h - nh));
          h = nh;
        }
        x = Math.max(0, Math.min(x, canvasW - 10));
        y = Math.max(0, Math.min(y, canvasH - 10));
        w = Math.max(10, Math.min(w, canvasW - x));
        h = Math.max(10, Math.min(h, canvasH - y));
        setSlots((p) => p.map((it) => (it.id === st.id ? { ...it, x, y, width: w, height: h } : it)));
      }
    };
    const onUp = () => (stateRef.current = { mode: null });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [slots, canvasW, canvasH, grid, zoom]);

  // --- Hotkeys ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        setSlots((p) => p.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setSlots((p) => {
          const s = p.find((x) => x.id === selectedId);
          if (!s) return p;
          const c = { ...s, id: uid(), x: snap(s.x + grid), y: snap(s.y + grid), name: s.name + " copy" };
          return [...p, c];
        });
      }
      if (e.key.toLowerCase() === "l") {
        setSlots((p) => p.map((s) => (s.id === selectedId ? { ...s, locked: !s.locked } : s)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, grid]);

  // --- Import/Export ---
  const exportJSON = () => {
    const data: LayoutData = { canvas: { width: canvasW, height: canvasH, grid }, background: bgSrc ? { src: bgSrc } : undefined, slots };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ui-layout.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as LayoutData;
        if (parsed.canvas) {
          setCanvasW(parsed.canvas.width || 1920);
          setCanvasH(parsed.canvas.height || 1080);
          setGrid(parsed.canvas.grid || 16);
        }
        setSlots(Array.isArray(parsed.slots) ? parsed.slots : []);
        setBgSrc(parsed.background?.src || null);
      } catch (e) {
        alert("Invalid JSON");
      }
    };
    reader.readAsText(file);
  };

  const exportPNG = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawSlots = () => {
      // grid (optional): light lines
      if (showGrid) {
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 1;
        for (let x = 0; x <= canvasW; x += grid) {
          ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, canvasH); ctx.stroke();
        }
        for (let y = 0; y <= canvasH; y += grid) {
          ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(canvasW, y + 0.5); ctx.stroke();
        }
      }
      slots.forEach((s) => {
        ctx.strokeStyle = s.color || typeColor[s.type] || "#111827";
        ctx.lineWidth = 2;
        ctx.setLineDash(s.locked ? [6, 6] : [4, 2]);
        ctx.strokeRect(s.x + 1, s.y + 1, s.width - 2, s.height - 2);
        ctx.setLineDash([]);
        if (showLabels) {
          ctx.fillStyle = "#111827";
          ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
          ctx.fillText(`${s.name} (${s.type})`, s.x + 6, s.y + 16);
        }
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url; a.download = "ui-layout.png"; a.click();
    };

    if (bgSrc) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvasW, canvasH);
        drawSlots();
      };
      img.src = bgSrc;
    } else {
      drawSlots();
    }
  };

  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBgSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const selected = slots.find((s) => s.id === selectedId) || null;

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "white",
      color: "#111827",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    }}>
      {/* Toolbar */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        borderBottom: "1px solid #e5e7eb",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(8px)"
      }}>
        <div style={{
          margin: "0 auto",
          maxWidth: "1200px",
          padding: "12px 16px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px"
        }}>
          <div style={{ fontWeight: 600 }}>UI Layout Editor - Mandate Game</div>

          <label style={{ fontSize: "14px" }}>
            W:
            <input
              style={{ marginLeft: "4px", width: "80px", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px" }}
              type="number"
              value={canvasW}
              onChange={(e) => setCanvasW(+e.target.value||0)}
            />
          </label>

          <label style={{ fontSize: "14px" }}>
            H:
            <input
              style={{ marginLeft: "4px", width: "80px", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px" }}
              type="number"
              value={canvasH}
              onChange={(e) => setCanvasH(+e.target.value||0)}
            />
          </label>

          <label style={{ fontSize: "14px" }}>
            Grid:
            <input
              style={{ marginLeft: "4px", width: "64px", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px" }}
              type="number"
              value={grid}
              onChange={(e) => setGrid(Math.max(2, +e.target.value||16))}
            />
          </label>

          <label style={{ fontSize: "14px" }}>
            Zoom:
            <select
              style={{ marginLeft: "4px", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px" }}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
            >
              <option value={0.25}>25%</option>
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1}>100%</option>
              <option value={1.5}>150%</option>
              <option value={2}>200%</option>
            </select>
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              + Öffentlichkeit
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
              onClick={() => addSlot("other")}
            >
              + Other
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
              <input
                type="checkbox"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
              />
              Labels
            </label>
            <button
              style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
              onClick={exportJSON}
            >
              Export JSON
            </button>
            <button
              style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
              onClick={exportPNG}
            >
              Export PNG
            </button>
            <button
              style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
              onClick={() => exportLayoutAsGameFormat({ canvas: { width: canvasW, height: canvasH, grid }, slots })}
            >
              Export Game Format
            </button>
            <label
              style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
            >
              Import JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && importJSON(e.target.files[0])}
              />
            </label>
            <label
              style={{ border: "1px solid #d1d5db", padding: "4px 12px", borderRadius: "4px", background: "white", cursor: "pointer" }}
              onMouseOver={(e) => e.currentTarget.style.background = "#f9fafb"}
              onMouseOut={(e) => e.currentTarget.style.background = "white"}
            >
              Hintergrund
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && handleBgUpload(e.target.files[0])}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{
        margin: "0 auto",
        maxWidth: "1200px",
        padding: "12px 16px",
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "16px"
      }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
          <div
            ref={stageRef}
            style={{
              position: "relative",
              background: "white",
              width: scaledCanvasW,
              height: scaledCanvasH,
              margin: "0 auto",
              transform: `scale(${zoom})`,
              transformOrigin: "0 0"
            }}
            onPointerDown={onStagePointerDown}
          >
            {/* Background image */}
            {bgSrc && (
              <img
                src={bgSrc}
                alt="bg"
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  pointerEvents: "none"
                }}
              />
            )}
            {/* Grid overlay */}
            {showGrid && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage: `repeating-linear-gradient(0deg, #e5e7eb 0, #e5e7eb 1px, transparent 1px, transparent ${grid * zoom}px), repeating-linear-gradient(90deg, #e5e7eb 0, #e5e7eb 1px, transparent 1px, transparent ${grid * zoom}px)`,
                }}
              />
            )}

            {/* Slots */}
            {slots.map((s) => (
              <SlotBox
                key={s.id}
                slot={s}
                selected={s.id === selectedId}
                onSelect={() => setSelectedId(s.id)}
                onBeginDrag={beginDrag}
                onBeginResize={beginResize}
                zoom={zoom}
              />
            ))}
          </div>
        </div>

        {/* Properties */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ fontWeight: 600 }}>Eigenschaften</div>
          {selectedId && selected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <label style={{ display: "block" }}>
                Name
                <input
                  style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                  value={selected.name}
                  onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, name: e.target.value } : x)))}
                />
              </label>
              <label style={{ display: "block" }}>
                Typ
                <select
                  style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                  value={selected.type}
                  onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, type: e.target.value, color: typeColor[e.target.value] } : x)))}
                >
                  <option value="government">government</option>
                  <option value="public">public</option>
                  <option value="dauerhaft">dauerhaft</option>
                  <option value="sofort">sofort</option>
                  <option value="other">other</option>
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label>
                  X
                  <input
                    style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    type="number"
                    value={selected.x}
                    onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, x: +e.target.value } : x)))}
                  />
                </label>
                <label>
                  Y
                  <input
                    style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    type="number"
                    value={selected.y}
                    onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, y: +e.target.value } : x)))}
                  />
                </label>
                <label>
                  W
                  <input
                    style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    type="number"
                    value={selected.width}
                    onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, width: +e.target.value } : x)))}
                  />
                </label>
                <label>
                  H
                  <input
                    style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                    type="number"
                    value={selected.height}
                    onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, height: +e.target.value } : x)))}
                  />
                </label>
              </div>
              <label style={{ display: "block" }}>
                Farbe
                <input
                  style={{ width: "100%", border: "1px solid #d1d5db", padding: "4px 8px", borderRadius: "4px", marginTop: "4px" }}
                  type="color"
                  value={selected.color || typeColor[selected.type]}
                  onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, color: e.target.value } : x)))}
                />
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  checked={!!selected.locked}
                  onChange={(e) => setSlots((p) => p.map((x) => (x.id === selected.id ? { ...x, locked: e.target.checked } : x)))}
                />
                Locked
              </label>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>
                Shortcuts: Del löschen · Ctrl/Cmd+D duplizieren · L lock/unlock
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Kein Slot ausgewählt.</div>
          )}

          <div style={{ paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontWeight: 600, marginBottom: "8px" }}>Export-Preview</div>
            <textarea
              style={{
                width: "100%",
                height: "192px",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                padding: "8px",
                fontSize: "12px",
                fontFamily: "monospace",
                resize: "none"
              }}
              readOnly
              value={JSON.stringify({ canvas: { width: canvasW, height: canvasH, grid }, slots }, null, 2)}
            />
          </div>
        </div>
      </div>

      <div style={{
        margin: "0 auto",
        maxWidth: "1200px",
        padding: "0 16px 32px",
        fontSize: "12px",
        color: "#6b7280"
      }}>
        Tipp: Lade ein PNG/JPG deiner Ziel-UI als Hintergrund und ziehe die Slots darüber. Export JSON → direkt ins Spiel übernehmen.
      </div>
    </div>
  );
}

interface SlotBoxProps {
  slot: Slot;
  selected: boolean;
  onSelect: () => void;
  onBeginDrag: (id: string, e: React.PointerEvent) => void;
  onBeginResize: (id: string, dir: string, e: React.PointerEvent) => void;
  zoom: number;
}

function SlotBox({ slot, selected, onSelect, onBeginDrag, onBeginResize, zoom }: SlotBoxProps) {
  const handles = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  return (
    <div
      style={{
        position: "absolute",
        userSelect: "none",
        pointerEvents: slot.locked ? "none" : "auto",
        cursor: slot.locked ? "default" : "move",
        left: slot.x * zoom,
        top: slot.y * zoom,
        width: slot.width * zoom,
        height: slot.height * zoom,
        border: `2px dashed ${slot.locked ? "#9ca3af" : (slot.color || typeColor[slot.type])}`,
        boxSizing: "border-box",
        background: "transparent"
      }}
      onPointerDown={(e) => { e.stopPropagation(); onSelect(); onBeginDrag(slot.id, e); }}
    >
      {/* label */}
      <div style={{ fontSize: "12px", color: "#374151", padding: "4px" }}>
        {slot.name} ({slot.type})
      </div>
      {/* resize handles */}
      {selected && !slot.locked && handles.map((dir) => (
        <div
          key={dir}
          onPointerDown={(e) => { e.stopPropagation(); onBeginResize(slot.id, dir, e); }}
          style={{
            position: "absolute",
            background: "white",
            border: "1px solid #6b7280",
            width: 10,
            height: 10,
            ...(posForHandle(dir, slot.width * zoom, slot.height * zoom)),
            cursor: cursorFor(dir)
          }}
        />
      ))}
    </div>
  );
}

function posForHandle(dir: string, w: number, h: number) {
  const map: Record<string, { left: number; top: number }> = {
    nw: { left: -5, top: -5 },
    n: { left: w / 2 - 5, top: -5 },
    ne: { left: w - 5, top: -5 },
    e: { left: w - 5, top: h / 2 - 5 },
    se: { left: w - 5, top: h - 5 },
    s: { left: w / 2 - 5, top: h - 5 },
    sw: { left: -5, top: h - 5 },
    w: { left: -5, top: h / 2 - 5 },
  };
  return map[dir];
}

function cursorFor(dir: string) {
  const map: Record<string, string> = { n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize" };
  return map[dir] || "default";
}
