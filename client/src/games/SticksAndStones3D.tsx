import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomState, SticksInput, SticksSnapshot } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: SticksSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: SticksInput) => void;
}

const OBSTACLES = [
  { x: 0, y: 1.0, z: 0, w: 7, h: 2, d: 7, color: 0xffd600 },
  { x: -11, y: 2.0, z: -11, w: 3, h: 4, d: 3, color: 0xff3b5c },
  { x: 11, y: 2.0, z: -11, w: 3, h: 4, d: 3, color: 0x00e5ff },
  { x: -11, y: 2.0, z: 11, w: 3, h: 4, d: 3, color: 0x22c55e },
  { x: 11, y: 2.0, z: 11, w: 3, h: 4, d: 3, color: 0xa855f7 },
  { x: -16, y: 1.0, z: 0, w: 3, h: 2, d: 5, color: 0xff6b00 },
  { x: 16, y: 1.0, z: 0, w: 3, h: 2, d: 5, color: 0xff6b00 },
  { x: 0, y: 1.0, z: -16, w: 5, h: 2, d: 3, color: 0xec4899 },
  { x: 0, y: 1.0, z: 16, w: 5, h: 2, d: 3, color: 0xec4899 },
];

const JUMP_PADS = [
  { x: -18, z: -18 },
  { x: 18, z: -18 },
  { x: -18, z: 18 },
  { x: 18, z: 18 },
];

export const SticksAndStones3D: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<SticksSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const [locked, setLocked] = useState(false);

  const inputRef = useRef({
    keys: new Set<string>(),
    touchMoveX: 0,
    touchMoveZ: 0,
    yaw: 0,
    pitch: 0,
    fireCrossbow: false,
    fireKnife: false,
    fireTomahawk: false,
    melee: false,
    touchJump: false,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x160d29);
    scene.fog = new THREE.Fog(0x160d29, 25, 72);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(18, 35, 14);
    scene.add(dirLight);

    // Floor + Grid
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 56),
      new THREE.MeshLambertMaterial({ color: 0x261844 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(54, 27, 0x00e5ff, 0x3b2667));

    // Arena boundary walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x000000, wireframe: false });
    const wallPositions = [
      [0, 2, -27, 54, 4, 1],
      [0, 2, 27, 54, 4, 1],
      [-27, 2, 0, 1, 4, 54],
      [27, 2, 0, 1, 4, 54],
    ];
    wallPositions.forEach(([x, y, z, w, h, d]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, y, z);
      scene.add(m);
    });

    // Obstacles
    OBSTACLES.forEach((ob) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(ob.w, ob.h, ob.d),
        new THREE.MeshLambertMaterial({ color: ob.color })
      );
      mesh.position.set(ob.x, ob.y, ob.z);
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      mesh.add(edges);
      scene.add(mesh);
    });

    // Jump pads
    JUMP_PADS.forEach((jp) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.1, 2.3, 0.35, 16),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      pad.position.set(jp.x, 0.18, jp.z);
      scene.add(pad);
    });

    const playerMeshes = new Map<string, THREE.Group>();
    const projMeshes = new Map<string, THREE.Mesh>();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // PC Controls
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.code;
      inputRef.current.keys.add(k);
      if (k === 'KeyE') {
        inputRef.current.fireKnife = true;
        sfx.shoot();
      }
      if (k === 'KeyQ') {
        inputRef.current.fireTomahawk = true;
        sfx.shoot();
      }
      if (k === 'KeyF' || k === 'KeyV') {
        inputRef.current.melee = true;
        sfx.whack();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        inputRef.current.yaw -= e.movementX * 0.0024;
        inputRef.current.pitch = Math.max(-1.3, Math.min(1.3, inputRef.current.pitch - e.movementY * 0.0024));
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      if (showTouch) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      if (e.button === 0) {
        inputRef.current.fireCrossbow = true;
        sfx.shoot();
      } else if (e.button === 2) {
        inputRef.current.fireKnife = true;
        sfx.shoot();
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onPointerLockChange = () => {
      setLocked(document.pointerLockElement === renderer.domElement);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    // Input sender at 30Hz
    const inputTimer = setInterval(() => {
      const inp = inputRef.current;
      let mx = inp.touchMoveX;
      let mz = inp.touchMoveZ;
      if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) mx -= 1;
      if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) mx += 1;
      if (inp.keys.has('KeyW') || inp.keys.has('ArrowUp')) mz += 1;
      if (inp.keys.has('KeyS') || inp.keys.has('ArrowDown')) mz -= 1;

      onSendInput({
        moveX: Math.max(-1, Math.min(1, mx)),
        moveZ: Math.max(-1, Math.min(1, mz)),
        yaw: inp.yaw,
        pitch: inp.pitch,
        jump: inp.keys.has('Space') || inp.touchJump,
        fireCrossbow: inp.fireCrossbow,
        fireKnife: inp.fireKnife,
        fireTomahawk: inp.fireTomahawk,
        melee: inp.melee,
      });
      inp.fireCrossbow = false;
      inp.fireKnife = false;
      inp.fireTomahawk = false;
      inp.melee = false;
    }, 33);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const snap = snapRef.current;
      if (snap) {
        const me = snap.players[myId];
        if (me) {
          camera.position.set(me.x, me.y + 1.55, me.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.y = inputRef.current.yaw;
          camera.rotation.x = inputRef.current.pitch;
        }

        // Sync other players
        const activeIds = new Set<string>();
        Object.values(snap.players).forEach((p) => {
          if (p.id === myId || !p.alive) return;
          activeIds.add(p.id);
          let grp = playerMeshes.get(p.id);
          if (!grp) {
            const prof = roomRef.current.players.find((x) => x.id === p.id);
            const col =
              roomRef.current.currentTeamMode === 'teams'
                ? prof?.team === 'red'
                  ? 0xff2e4c
                  : 0x00b8ff
                : new THREE.Color(prof?.color || '#ffd600').getHex();
            grp = new THREE.Group();
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(0.95, 1.5, 0.95),
              new THREE.MeshLambertMaterial({ color: col })
            );
            body.position.y = 0.85;
            grp.add(body);
            // Eyes
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.1), eyeMat);
            eyeL.position.set(-0.2, 1.2, -0.48);
            const eyeR = eyeL.clone();
            eyeR.position.x = 0.2;
            grp.add(eyeL, eyeR);
            scene.add(grp);
            playerMeshes.set(p.id, grp);
          }
          grp.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.35);
          grp.rotation.y = p.yaw;
        });
        for (const [id, grp] of playerMeshes.entries()) {
          if (!activeIds.has(id)) {
            scene.remove(grp);
            playerMeshes.delete(id);
          }
        }

        // Sync projectiles
        const activeProj = new Set<string>();
        snap.projectiles.forEach((pr) => {
          activeProj.add(pr.id);
          let mesh = projMeshes.get(pr.id);
          if (!mesh) {
            const color = pr.kind === 'bolt' ? 0xff6b00 : pr.kind === 'tomahawk' ? 0xff0055 : 0x00e5ff;
            const geo =
              pr.kind === 'tomahawk'
                ? new THREE.BoxGeometry(0.45, 0.45, 0.15)
                : new THREE.SphereGeometry(0.18, 8, 8);
            mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
            scene.add(mesh);
            projMeshes.set(pr.id, mesh);
          }
          mesh.position.set(pr.x, pr.y, pr.z);
          if (pr.kind === 'tomahawk') mesh.rotation.x += 0.35;
        });
        for (const [id, mesh] of projMeshes.entries()) {
          if (!activeProj.has(id)) {
            scene.remove(mesh);
            projMeshes.delete(id);
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(inputTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      if (document.pointerLockElement === renderer.domElement) {
        document.exitPointerLock?.();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [myId, showTouch]);

  const me = snapshot?.players[myId];
  const sorted = snapshot
    ? Object.values(snapshot.players).sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className="game-surface" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* Top HUD */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
        }}
      >
        <div
          className="comic-box font-arcade"
          style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 20 }}
        >
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

      {/* Mini Scoreboard */}
      <div
        className="comic-box"
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 30,
          background: 'rgba(20, 12, 36, 0.86)',
          padding: '8px 12px',
          minWidth: 165,
          fontSize: 12,
        }}
      >
        <div className="font-arcade" style={{ color: '#FFD600', marginBottom: 4 }}>
          STICKS & STONES
        </div>
        {sorted.slice(0, 5).map((p) => {
          const prof = room.players.find((x) => x.id === p.id);
          return (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, gap: 10 }}>
              <span style={{ color: p.id === myId ? '#00E5FF' : '#fff' }}>{prof?.name}</span>
              <span style={{ color: '#FFD600' }}>{p.score}</span>
            </div>
          );
        })}
      </div>

      {/* Crosshair */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 14,
          height: 14,
          borderRadius: '999px',
          border: '2px solid #FFD600',
          boxShadow: '0 0 0 2px #000',
          pointerEvents: 'none',
          zIndex: 25,
        }}
      />

      {/* Click to Lock Prompt on PC */}
      {!showTouch && !locked && (
        <div
          style={{
            position: 'fixed',
            bottom: 86,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.82)',
            border: '2px solid #FFD600',
            borderRadius: 12,
            padding: '8px 16px',
            fontWeight: 700,
            fontSize: 14,
            color: '#FFD600',
            pointerEvents: 'none',
            zIndex: 30,
          }}
        >
          CLICK GAME TO AIM • L-CLICK: CROSSBOW • R-CLICK/E: KNIFE • Q: TOMAHAWK (BANKRUPTS!)
        </div>
      )}

      {/* Respawn Banner */}
      {me && !me.alive && (
        <div
          className="font-arcade animate-pop"
          style={{
            position: 'fixed',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: '#FF3B5C',
            border: '4px solid #000',
            padding: '12px 24px',
            borderRadius: 14,
            fontSize: 26,
            zIndex: 35,
          }}
        >
          KO! RESPAWNING...
        </div>
      )}

      {/* Weapon Bar (PC) */}
      {!showTouch && me && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 10,
            zIndex: 30,
          }}
        >
          {[
            { label: 'L-CLICK: CROSSBOW', cd: me.crossbowCd, col: '#FF6B00' },
            { label: 'E / R-CLICK: KNIFE', cd: me.knifeCd, col: '#00E5FF' },
            { label: 'Q: TOMAHAWK', cd: me.tomahawkCd, col: '#FF0055' },
            { label: 'F: MELEE', cd: me.meleeCd, col: '#FFD600' },
          ].map((w) => (
            <div
              key={w.label}
              className="comic-box"
              style={{
                background: w.cd > 0.05 ? '#1f1633' : w.col,
                color: w.cd > 0.05 ? '#9ca3af' : '#000',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {w.label}
            </div>
          ))}
        </div>
      )}

      {/* Mobile Touch Controls */}
      {showTouch && (
        <TouchControls
          onMove={(x, y) => {
            inputRef.current.touchMoveX = x;
            inputRef.current.touchMoveZ = y;
          }}
          onLookDelta={(dx, dy) => {
            inputRef.current.yaw -= dx * 0.006;
            inputRef.current.pitch = Math.max(-1.3, Math.min(1.3, inputRef.current.pitch - dy * 0.006));
          }}
          buttons={[
            {
              id: 'bolt',
              label: 'BOW',
              color: '#FF6B00',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.fireCrossbow = true;
                  sfx.shoot();
                }
              },
            },
            {
              id: 'knife',
              label: 'KNIFE',
              color: '#00E5FF',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.fireKnife = true;
                  sfx.shoot();
                }
              },
            },
            {
              id: 'axe',
              label: 'AXE',
              color: '#FF3B5C',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.fireTomahawk = true;
                  sfx.shoot();
                }
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
