import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GAME_CATALOG, RoomState, Shooter3DInput, Shooter3DSnapshot } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: Shooter3DSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: Shooter3DInput) => void;
}

const PILLARS = [
  { x: -10, z: -10, w: 3, h: 5, d: 3, col: 0xff3b5c },
  { x: 10, z: -10, w: 3, h: 5, d: 3, col: 0x00e5ff },
  { x: -10, z: 10, w: 3, h: 5, d: 3, col: 0x22c55e },
  { x: 10, z: 10, w: 3, h: 5, d: 3, col: 0xa855f7 },
  { x: 0, z: 0, w: 5, h: 3, d: 5, col: 0xffd600 },
];

export const Shooter3DView: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<Shooter3DSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchMoveX: 0,
    touchMoveZ: 0,
    yaw: 0,
    pitch: 0,
    shoot: false,
    touchJump: false,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x110922);
    scene.fog = new THREE.Fog(0x110922, 24, 70);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(16, 30, 14);
    scene.add(dirLight);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 52),
      new THREE.MeshLambertMaterial({ color: 0x22163b })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(50, 25, 0xff3b5c, 0x3b2667));

    PILLARS.forEach((p) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), new THREE.MeshLambertMaterial({ color: p.col }));
      m.position.set(p.x, p.h / 2, p.z);
      scene.add(m);
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

    const onKeyDown = (e: KeyboardEvent) => inputRef.current.keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => inputRef.current.keys.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        inputRef.current.yaw -= e.movementX * 0.0024;
        inputRef.current.pitch = Math.max(-1.3, Math.min(1.3, inputRef.current.pitch - e.movementY * 0.0024));
      }
    };
    const onMouseDown = () => {
      if (showTouch) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      inputRef.current.shoot = true;
      sfx.shoot();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);

    const timer = setInterval(() => {
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
        shoot: inp.shoot,
        dash: inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight'),
      });
      inp.shoot = false;
    }, 33);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const snap = snapRef.current;
      if (snap) {
        const me = snap.players[myId];
        if (me) {
          camera.position.set(me.x, me.y + 1.5, me.z);
          camera.rotation.order = 'YXZ';
          camera.rotation.y = inputRef.current.yaw;
          camera.rotation.x = inputRef.current.pitch;
        }

        const activeIds = new Set<string>();
        Object.values(snap.players).forEach((p) => {
          if (p.id === myId || !p.alive) return;
          activeIds.add(p.id);
          let grp = playerMeshes.get(p.id);
          if (!grp) {
            const prof = roomRef.current.players.find((x) => x.id === p.id);
            grp = new THREE.Group();
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(0.95, 1.5, 0.95),
              new THREE.MeshLambertMaterial({ color: prof?.color || '#FFD600' })
            );
            body.position.y = 0.75;
            grp.add(body);
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

        const activeProj = new Set<string>();
        snap.projectiles.forEach((pr) => {
          activeProj.add(pr.id);
          let m = projMeshes.get(pr.id);
          if (!m) {
            m = new THREE.Mesh(new THREE.SphereGeometry(pr.r, 8, 8), new THREE.MeshBasicMaterial({ color: pr.color }));
            scene.add(m);
            projMeshes.set(pr.id, m);
          }
          m.position.set(pr.x, pr.y, pr.z);
        });
        for (const [id, m] of projMeshes.entries()) {
          if (!activeProj.has(id)) {
            scene.remove(m);
            projMeshes.delete(id);
          }
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(timer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
    };
  }, [myId, showTouch]);

  const title = snapshot ? GAME_CATALOG[snapshot.mode].title : '';

  return (
    <div className="game-surface" style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'fixed',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
        }}
      >
        <div className="comic-box font-arcade" style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 18 }}>
          ⏱ {snapshot?.timeRemaining ?? '--'}s • {title}
        </div>
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
          border: '2px solid #00E5FF',
          boxShadow: '0 0 0 2px #000',
          pointerEvents: 'none',
          zIndex: 25,
        }}
      />

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
              id: 'shoot',
              label: 'FIRE',
              color: '#FF3B5C',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.shoot = true;
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
