import React, { useEffect, useRef } from 'react';
import { RoomState, SmashInput, SmashSnapshot } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: SmashSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: SmashInput) => void;
}

export const SmashBrawler2D: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const snapRef = useRef<SmashSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchMoveX: 0,
    touchDown: false,
    touchJump: false,
    touchLight: false,
    touchHeavy: false,
    touchSpecial: false,
    touchDash: false,
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
      if (['KeyJ', 'KeyZ', 'KeyK', 'KeyX', 'KeyL', 'KeyC'].includes(e.code)) {
        sfx.whack();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const inputTimer = setInterval(() => {
      const inp = inputRef.current;
      let mx = inp.touchMoveX;
      if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) mx -= 1;
      if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) mx += 1;

      onSendInput({
        moveX: Math.max(-1, Math.min(1, mx)),
        down: inp.keys.has('KeyS') || inp.keys.has('ArrowDown') || inp.touchDown,
        jump: inp.keys.has('KeyW') || inp.keys.has('ArrowUp') || inp.keys.has('Space') || inp.touchJump,
        light: inp.keys.has('KeyJ') || inp.keys.has('KeyZ') || inp.touchLight,
        heavy: inp.keys.has('KeyK') || inp.keys.has('KeyX') || inp.touchHeavy,
        special: inp.keys.has('KeyL') || inp.keys.has('KeyC') || inp.touchSpecial,
        dash: inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight') || inp.touchDash,
      });
    }, 33);

    let animId = 0;
    const render = () => {
      animId = requestAnimationFrame(render);
      const w = canvas.width;
      const h = canvas.height;
      const snap = snapRef.current;

      // Sky background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#1B0E38');
      grad.addColorStop(1, '#3B1966');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle comic grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      for (let gx = 0; gx < w; gx += 60) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += 60) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      if (!snap) return;

      // World-to-screen transform
      const scale = Math.min(w / 1080, h / 680);
      const toSX = (wx: number) => w / 2 + wx * scale;
      const toSY = (wy: number) => h / 2 + 40 - wy * scale;

      // Platforms
      const drawPlatform = (x1: number, x2: number, y: number, solid: boolean, color: string) => {
        const sx = toSX(x1);
        const sy = toSY(y);
        const pw = (x2 - x1) * scale;
        const ph = (solid ? 38 : 14) * scale;
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(2, 4 * scale);
        ctx.beginPath();
        ctx.roundRect(sx, sy, pw, ph, 8 * scale);
        ctx.fill();
        ctx.stroke();
      };

      drawPlatform(-360, 360, -40, true, '#FF3B5C');
      drawPlatform(-300, -130, 95, false, '#00E5FF');
      drawPlatform(130, 300, 95, false, '#00E5FF');
      drawPlatform(-85 + snap.platformOffset, 85 + snap.platformOffset, 215, false, '#FFD600');

      // Projectiles
      snap.projectiles.forEach((pr) => {
        ctx.save();
        ctx.fillStyle = pr.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.arc(toSX(pr.x), toSY(pr.y), 14 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Fighters
      Object.values(snap.players).forEach((p) => {
        if (!p.alive) return;
        if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) return;

        const prof = roomRef.current.players.find((x) => x.id === p.id);
        const sx = toSX(p.x);
        const sy = toSY(p.y);
        const bodyW = 42 * scale;
        const bodyH = 48 * scale;

        ctx.save();
        ctx.translate(sx, sy - bodyH / 2);

        // Squash & stretch
        const stretch = 1 + Math.min(0.25, Math.abs(p.vy) / 1800);
        ctx.scale(1 / stretch, stretch);

        // Team outline or black outline
        ctx.fillStyle = prof?.color || '#FFD600';
        ctx.strokeStyle =
          roomRef.current.currentTeamMode === 'teams'
            ? prof?.team === 'red'
              ? '#FF2E4C'
              : '#00E5FF'
            : '#000';
        ctx.lineWidth = 4 * scale;

        ctx.beginPath();
        ctx.roundRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH, 10 * scale);
        ctx.fill();
        ctx.stroke();

        // Eyes
        const eyeOff = p.facing * 7 * scale;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(eyeOff - 6 * scale, -6 * scale, 6 * scale, 0, Math.PI * 2);
        ctx.arc(eyeOff + 6 * scale, -6 * scale, 6 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(eyeOff - 5 * scale + p.facing * 2, -6 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.arc(eyeOff + 7 * scale + p.facing * 2, -6 * scale, 3 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Attack Swoosh
        if (p.attackState === 'light' || p.attackState === 'heavy') {
          ctx.strokeStyle = p.attackState === 'heavy' ? '#FF3B5C' : '#FFD600';
          ctx.lineWidth = (p.attackState === 'heavy' ? 10 : 6) * scale;
          ctx.beginPath();
          ctx.arc(
            p.facing * 24 * scale,
            0,
            (p.attackState === 'heavy' ? 42 : 28) * scale,
            p.facing > 0 ? -0.9 : Math.PI - 0.9,
            p.facing > 0 ? 0.9 : Math.PI + 0.9
          );
          ctx.stroke();
        }
        ctx.restore();

        // Nametag above head
        ctx.fillStyle = p.id === myId ? '#00E5FF' : '#fff';
        ctx.font = `bold ${Math.max(10, Math.round(13 * scale))}px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`${prof?.name || ''}`, sx, sy - bodyH - 10 * scale);
      });
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(inputTimer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [myId]);

  const playersList = snapshot ? Object.values(snapshot.players) : [];

  return (
    <div className="game-surface" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Top Timer */}
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
        <div className="comic-box font-arcade" style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 20 }}>
          ⏱ {snapshot?.timeRemaining ?? '--'}s
        </div>
        {room.currentTeamMode === 'teams' && snapshot && (
          <div className="comic-box font-arcade" style={{ background: '#140C24', padding: '6px 14px', fontSize: 16 }}>
            <span style={{ color: '#FF3B5C' }}>RED {snapshot.teamScores.red}</span>
            {' vs '}
            <span style={{ color: '#00E5FF' }}>BLUE {snapshot.teamScores.blue}</span>
          </div>
        )}
      </div>

      {/* Bottom Smash % Cards */}
      <div
        style={{
          position: 'fixed',
          bottom: showTouch ? 160 : 14,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'center',
          zIndex: 25,
          pointerEvents: 'none',
        }}
      >
        {playersList.map((p) => {
          const prof = room.players.find((x) => x.id === p.id);
          const dmgCol = p.damage > 120 ? '#FF3B5C' : p.damage > 60 ? '#FF6B00' : '#FFD600';
          return (
            <div
              key={p.id}
              className="comic-box"
              style={{
                background: 'rgba(20, 12, 36, 0.9)',
                padding: '6px 12px',
                minWidth: 105,
                textAlign: 'center',
                borderColor: p.id === myId ? '#00E5FF' : '#000',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: prof?.color || '#fff' }}>
                {prof?.name}
              </div>
              <div className="font-arcade" style={{ fontSize: 22, color: dmgCol, lineHeight: 1.1 }}>
                {Math.round(p.damage)}%
              </div>
              <div style={{ fontSize: 12 }}>
                {'❤️'.repeat(Math.max(0, p.stocks))}
                {p.stocks <= 0 && <span style={{ color: '#FF3B5C', fontWeight: 700 }}>OUT</span>}
              </div>
            </div>
          );
        })}
      </div>

      {showTouch && (
        <TouchControls
          onMove={(x, y) => {
            inputRef.current.touchMoveX = x;
            inputRef.current.touchDown = y < -0.55;
          }}
          buttons={[
            {
              id: 'light',
              label: 'JAB',
              color: '#FFD600',
              onPressChange: (p) => {
                inputRef.current.touchLight = p;
                if (p) sfx.whack();
              },
            },
            {
              id: 'heavy',
              label: 'SMASH',
              color: '#FF3B5C',
              onPressChange: (p) => {
                inputRef.current.touchHeavy = p;
                if (p) sfx.whack();
              },
            },
            {
              id: 'special',
              label: 'SPEC',
              color: '#00E5FF',
              onPressChange: (p) => {
                inputRef.current.touchSpecial = p;
                if (p) sfx.shoot();
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
