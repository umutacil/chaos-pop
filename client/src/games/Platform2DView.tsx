import React, { useEffect, useRef } from 'react';
import { GAME_CATALOG, PlatformInput, PlatformSnapshot, RoomState } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: PlatformSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: PlatformInput) => void;
}

export const Platform2DView: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<PlatformSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchX: 0,
    touchDown: false,
    touchJump: false,
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
      if (e.code === 'KeyJ' || e.code === 'KeyZ') sfx.whack();
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
      if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) mx -= 1;
      if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) mx += 1;

      onSendInput({
        moveX: Math.max(-1, Math.min(1, mx)),
        down: inp.keys.has('KeyS') || inp.keys.has('ArrowDown') || inp.touchDown,
        jump: inp.keys.has('KeyW') || inp.keys.has('ArrowUp') || inp.keys.has('Space') || inp.touchJump,
        action: inp.keys.has('KeyJ') || inp.keys.has('KeyZ') || inp.touchAction || inp.clickAction,
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

      ctx.fillStyle = '#1B0E38';
      ctx.fillRect(0, 0, w, h);
      if (!snap) return;

      const scale = Math.min(w / 920, h / 640);
      const toSX = (wx: number) => w / 2 + wx * scale;
      const toSY = (wy: number) => h / 2 + 50 - wy * scale;

      // Capture Zone
      if (snap.zone) {
        ctx.fillStyle = 'rgba(255, 214, 0, 0.22)';
        ctx.strokeStyle = '#FFD600';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.arc(toSX(snap.zone.x), toSY(snap.zone.y), snap.zone.r * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Soccer Goals
      if (snap.mode === '2d_rocket_soccer') {
        ctx.fillStyle = 'rgba(255, 59, 92, 0.3)';
        ctx.fillRect(toSX(-420), toSY(60), 40 * scale, 140 * scale);
        ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
        ctx.fillRect(toSX(380), toSY(60), 40 * scale, 140 * scale);
      }

      // Platforms
      const plats = [
        { x1: -380, x2: 380, y: -80, col: '#FF3B5C' },
        { x1: -310, x2: -120, y: 55, col: '#00E5FF' },
        { x1: 120, x2: 310, y: 55, col: '#00E5FF' },
        { x1: -110, x2: 110, y: 175, col: '#FFD600' },
      ];
      plats.forEach((pl) => {
        ctx.fillStyle = pl.col;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.roundRect(toSX(pl.x1), toSY(pl.y), (pl.x2 - pl.x1) * scale, 16 * scale, 6 * scale);
        ctx.fill();
        ctx.stroke();
      });

      // Lasers
      snap.lasers.forEach((l) => {
        ctx.strokeStyle = l.active ? '#FF0044' : 'rgba(255, 0, 68, 0.3)';
        ctx.lineWidth = (l.active ? 12 : 3) * scale;
        ctx.beginPath();
        ctx.moveTo(toSX(l.x1), toSY(l.y));
        ctx.lineTo(toSX(l.x2), toSY(l.y));
        ctx.stroke();
      });

      // Hazards / Stars / Checkpoints / Bolts
      snap.hazards.forEach((hz) => {
        ctx.fillStyle = hz.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(toSX(hz.x), toSY(hz.y), hz.r * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      // Soccer Ball
      if (snap.ball) {
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.arc(toSX(snap.ball.x), toSY(snap.ball.y), snap.ball.r * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Lava
      if (snap.mode === '2d_floor_lava') {
        const ly = toSY(snap.lavaY);
        ctx.fillStyle = 'rgba(255, 59, 0, 0.78)';
        ctx.fillRect(0, ly, w, h - ly);
      }

      // Players
      Object.values(snap.players).forEach((p) => {
        if (!p.alive) return;
        const prof = roomRef.current.players.find((x) => x.id === p.id);
        const sx = toSX(p.x);
        const sy = toSY(p.y);
        const bw = 34 * scale;
        const bh = 40 * scale;

        ctx.fillStyle = prof?.color || '#FFD600';
        ctx.strokeStyle = p.id === myId ? '#fff' : '#000';
        ctx.lineWidth = 3.5 * scale;
        ctx.beginPath();
        ctx.roundRect(sx - bw / 2, sy - bh, bw, bh, 8 * scale);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, Math.round(12 * scale))}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${prof?.name || ''} (${Math.round(p.score)})`, sx, sy - bh - 8 * scale);
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
            inputRef.current.touchDown = y < -0.55;
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
            {
              id: 'jump',
              label: 'JUMP',
              color: '#22C55E',
              onPressChange: (p) => {
                inputRef.current.touchJump = p;
              },
            },
          ]}
        />
      )}
    </div>
  );
};
