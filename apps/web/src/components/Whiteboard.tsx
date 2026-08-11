import { useEffect, useRef, useState } from 'react';
import type * as Y from 'yjs';

interface WhiteboardProps {
  doc: Y.Doc;
}

interface Stroke {
  id: string;
  color: string;
  size: number;
  points: [number, number][];
}

const COLORS = ['#1a2332', '#3d80d9', '#d94555', '#2f9e6b', '#e0b03f'];

export function Whiteboard({ doc }: WhiteboardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [color, setColor] = useState<string>(COLORS[1]);
  const [size, setSize] = useState(3);

  const strokesArr = doc.getArray<Stroke>('whiteboard');
  const drawingRef = useRef<Stroke | null>(null);
  const dprRef = useRef(1);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;

    function resize() {
      if (!wrapper || !canvas) return;
      const rect = wrapper.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redraw();
    }

    function redraw() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const strokes = strokesArr.toArray();
      for (const s of strokes) drawStroke(ctx, s);
      if (drawingRef.current) drawStroke(ctx, drawingRef.current);
    }

    function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
      const rect = canvas!.getBoundingClientRect();
      const scaleX = canvas!.width / rect.width;
      const scaleY = canvas!.height / rect.height;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.size * dprRef.current;
      ctx.beginPath();
      for (let i = 0; i < s.points.length; i++) {
        const [nx, ny] = s.points[i];
        const x = nx * rect.width * scaleX;
        const y = ny * rect.height * scaleY;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrapper);
    const off = () => redraw();
    strokesArr.observe(off);
    (canvas as HTMLCanvasElement & { __redraw?: () => void }).__redraw = redraw;

    return () => {
      ro.disconnect();
      strokesArr.unobserve(off);
    };
  }, [strokesArr]);

  function pointerToNorm(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    return [clamp01(nx), clamp01(ny)];
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.target as Element).setPointerCapture(e.pointerId);
    const stroke: Stroke = {
      id: crypto.randomUUID(),
      color,
      size,
      points: [pointerToNorm(e)],
    };
    drawingRef.current = stroke;
    triggerRedraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current.points.push(pointerToNorm(e));
    triggerRedraw();
  }

  function handlePointerUp() {
    const s = drawingRef.current;
    if (!s) return;
    drawingRef.current = null;
    strokesArr.push([s]);
    triggerRedraw();
  }

  function triggerRedraw() {
    const canvas = canvasRef.current as (HTMLCanvasElement & { __redraw?: () => void }) | null;
    canvas?.__redraw?.();
  }

  function clearBoard() {
    doc.transact(() => {
      strokesArr.delete(0, strokesArr.length);
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid var(--color-border)',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`Color ${c}`}
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                background: c,
                border:
                  c === color ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
          <input
            type="range"
            min={1}
            max={12}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            style={{ marginLeft: 4 }}
            aria-label="Brush size"
          />
        </div>
        <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={clearBoard}>
          Clear
        </button>
      </div>
      <div
        ref={wrapperRef}
        style={{ flex: 1, minHeight: 0, background: 'var(--color-accent-tint)' }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ display: 'block', touchAction: 'none', cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}
