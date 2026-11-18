import React, { useEffect, useRef } from 'react';
import { GAME_CATALOG, RoomState, TopDownInput, TopDownSnapshot } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: TopDownSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: TopDownInput) => void;
}

export const TopDown2DView: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<TopDownSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchX: 0,
    touchY: 0,
    touchAction: false,
    touchDash: false,
    clickAction: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onKeyDown = (e: KeyboardEvent) => {
      inputRef.current.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyJ') sfx.whack();
    };
    const onKeyUp = (e: KeyboardEvent) => inputRef.current.keys.delete(e.code);
    const onMouseDown = () => {
      if (!showTouch) {
        inputRef.current.clickAction = true;
        sfx.whack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('mousedown', onMouseDown);

    const timer = setInterval(() => {
      const inp = inputRef.current;
      let mx = inp.touchX;
      let my = -inp.touchY;
      if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) mx -= 1;
      if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) mx += 1;
      if (inp.keys.has('KeyW') || inp.keys.has('ArrowUp')) my -= 1;
      if (inp.keys.has('KeyS') || inp.keys.has('ArrowDown')) my += 1;

      onSendInput({
        moveX: Math.max(-1, Math.min(1, mx)),
        moveY: Math.max(-1, Math.min(1, my)),
        action: inp.keys.has('Space') || inp.keys.has('KeyJ') || inp.touchAction || inp.clickAction,
        dash: inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight') || inp.touchDash,
      });
      inp.clickAction = false;
    }, 33);

    let animId = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      const snap = snapRef.current;

      ctx.fillStyle = '#140C24';
      ctx.fillRect(0, 0, w, h);

      if (!snap) return;
      const scale = Math.min(w / 920, h / 680);
      const toSX = (x: number) => w / 2 + x * scale;
      const toSY = (y: number) => h / 2 + y * scale;

      // Arena floor
      if (snap.mode === '2d_sumo_push') {
        ctx.fillStyle = '#2B1B4D';
        ctx.strokeStyle = '#FF3B5C';
        ctx.lineWidth = 6 * scale;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, snap.arenaRadius * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        const aw = 420 * 2 * scale;
        const ah = 300 * 2 * scale;
        ctx.fillStyle = '#22163B';
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 4 * scale;
        ctx.fillRect(w / 2 - aw / 2, h / 2 - ah / 2, aw, ah);
        ctx.strokeRect(w / 2 - aw / 2, h / 2 - ah / 2, aw, ah);

        if (snap.paintGrid) {
          const { cols, rows, cells } = snap.paintGrid;
          const cw = aw / cols;
          const ch = ah / rows;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const col = cells[r * cols + c];
              if (col) {
                ctx.fillStyle = col;
                ctx.globalAlpha = 0.55;
                ctx.fillRect(w / 2 - aw / 2 + c * cw, h / 2 - ah / 2 + r * ch, cw, ch);
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      }

      // Items
      snap.items.forEach((it) => {
        ctx.save();
        ctx.fillStyle = it.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        if (it.kind === 'crate') {
          ctx.rect(toSX(it.x) - it.r * scale, toSY(it.y) - it.r * scale, it.r * 2 * scale, it.r * 2 * scale);
        } else {
          ctx.arc(toSX(it.x), toSY(it.y), it.r * scale, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Players
      Object.values(snap.players).forEach((p) => {
        if (!p.alive) return;
        const prof = roomRef.current.players.find((x) => x.id === p.id);
        const sx = toSX(p.x);
        const sy = toSY(p.y);
        const r = 19 * scale;

        ctx.save();
        ctx.fillStyle = p.frozen ? '#7DD3FC' : p.infected ? '#22C55E' : prof?.color || '#FFD600';
        ctx.strokeStyle = p.id === myId ? '#fff' : '#000';
        ctx.lineWidth = 3.5 * scale;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Direction indicator / Tank barrel
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5 * scale;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + Math.cos(p.angle) * r * 1.35, sy + Math.sin(p.angle) * r * 1.35);
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${prof?.name || ''} (${Math.round(p.score)})`, sx, sy - r - 8 * scale);
        ctx.restore();
      });
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousedown', onMouseDown);
    };
  }, [myId, showTouch]);

  const title = snapshot ? GAME_CATALOG[snapshot.mode].title : '';

  return (
    <div className="game-surface" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          display: 'flex',
          gap: 10,
        }}
      >
        <div className="comic-box font-arcade" style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 18 }}>
          ⏱ {snapshot?.timeRemaining ?? '--'}s • {title}
        </div>
      </div>

      {showTouch && (
        <TouchControls
          onMove={(x, y) => {
            inputRef.current.touchX = x;
            inputRef.current.touchY = y;
          }}
          buttons={[
            {
              id: 'act',
              label: 'ACT',
              color: '#FF3B5C',
              onPressChange: (p) => {
                inputRef.current.touchAction = p;
                if (p) sfx.whack();
              },
            },
            {
              id: 'dash',
              label: 'DASH',
              color: '#00E5FF',
              onPressChange: (p) => {
                inputRef.current.touchDash = p;
              },
            },
          ]}
        />
      )}
    </div>
  );
};
