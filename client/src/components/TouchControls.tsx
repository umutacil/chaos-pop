import React, { useRef, useState } from 'react';

export interface TouchActionButton {
  id: string;
  label: string;
  color: string;
  onPressChange: (pressed: boolean) => void;
}

interface Props {
  onMove: (x: number, y: number) => void; // x: -1..1, y: -1..1 (up is +1)
  onLookDelta?: (dx: number, dy: number) => void;
  buttons: TouchActionButton[];
}

export const TouchControls: React.FC<Props> = ({ onMove, onLookDelta, buttons }) => {
  const stickRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const stickTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const lastLook = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleStickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const t = e.changedTouches[0];
    stickTouchId.current = t.identifier;
    updateStick(t.clientX, t.clientY);
  };

  const handleStickMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      if (t.identifier === stickTouchId.current) {
        updateStick(t.clientX, t.clientY);
      }
    }
  };

  const handleStickEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickTouchId.current) {
        stickTouchId.current = null;
        setKnob({ x: 0, y: 0 });
        onMove(0, 0);
      }
    }
  };

  const updateStick = (cx: number, cy: number) => {
    const el = stickRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = cx - centerX;
    let dy = cy - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxR, -dy / maxR);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 35,
        pointerEvents: 'none',
      }}
    >
      {/* Right-side Look Drag Zone (for 3D games) */}
      {onLookDelta && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            right: 0,
            width: '55%',
            height: '65%',
            pointerEvents: 'auto',
          }}
          onTouchStart={(e) => {
            const t = e.changedTouches[0];
            lookTouchId.current = t.identifier;
            lastLook.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchMove={(e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
              const t = e.changedTouches[i];
              if (t.identifier === lookTouchId.current) {
                const dx = t.clientX - lastLook.current.x;
                const dy = t.clientY - lastLook.current.y;
                lastLook.current = { x: t.clientX, y: t.clientY };
                onLookDelta(dx, dy);
              }
            }
          }}
          onTouchEnd={(e) => {
            for (let i = 0; i < e.changedTouches.length; i++) {
              if (e.changedTouches[i].identifier === lookTouchId.current) {
                lookTouchId.current = null;
              }
            }
          }}
        />
      )}

      {/* Left Virtual Joystick */}
      <div
        ref={stickRef}
        onTouchStart={handleStickStart}
        onTouchMove={handleStickMove}
        onTouchEnd={handleStickEnd}
        onTouchCancel={handleStickEnd}
        style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          width: 120,
          height: 120,
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.14)',
          border: '3px solid rgba(255,255,255,0.45)',
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '999px',
            background: '#FFD600',
            border: '3px solid #000',
            transform: `translate(${knob.x}px, ${knob.y}px)`,
          }}
        />
      </div>

      {/* Right Action Buttons */}
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          right: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 66px)',
          gap: 10,
          pointerEvents: 'auto',
        }}
      >
        {buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              b.onPressChange(true);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              b.onPressChange(false);
            }}
            onTouchCancel={() => b.onPressChange(false)}
            style={{
              width: 66,
              height: 66,
              borderRadius: '999px',
              background: b.color,
              color: '#000',
              border: '3px solid #000',
              boxShadow: '3px 3px 0 #000',
              fontFamily: 'Bungee, sans-serif',
              fontSize: 11,
              lineHeight: 1.05,
              padding: 4,
              touchAction: 'none',
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
};
