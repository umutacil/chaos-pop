import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BombInput, BombSnapshot, RoomState } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: BombSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: BombInput) => void;
}

const TRAMPOLINES = [
  { x: -9, z: 0 },
  { x: 9, z: 0 },
  { x: 0, z: -9 },
  { x: 0, z: 9 },
];

export const BombTag3D: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<BombSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchMoveX: 0,
    touchMoveZ: 0,
    yaw: 0,
    shove: false,
    touchJump: false,
    touchSprint: false,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1b3e);
    scene.fog = new THREE.Fog(0x0d1b3e, 28, 80);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(15, 30, 15);
    scene.add(dirLight);

    // Arena disk (scaled dynamically to arenaRadius / 20)
    const arenaMat = new THREE.MeshLambertMaterial({ color: 0x2a1852 });
    const arenaMesh = new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 1.2, 40), arenaMat);
    arenaMesh.position.y = -0.6;
    scene.add(arenaMesh);

    const ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(19.3, 20.1, 48),
      new THREE.MeshBasicMaterial({ color: 0xff3b5c, side: THREE.DoubleSide })
    );
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.05;
    scene.add(ringMesh);

    // Trampolines
    TRAMPOLINES.forEach((tr) => {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(2.0, 2.2, 0.35, 16),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff })
      );
      pad.position.set(tr.x, 0.18, tr.z);
      scene.add(pad);
    });

    // Floating giant bomb mesh
    const bombMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff1e42 })
    );
    scene.add(bombMesh);

    const playerMeshes = new Map<string, THREE.Group>();

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', onResize);

    const onKeyDown = (e: KeyboardEvent) => {
      inputRef.current.keys.add(e.code);
      if (e.code === 'KeyF') {
        inputRef.current.shove = true;
        sfx.whack();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.code);
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        inputRef.current.yaw -= e.movementX * 0.0025;
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (showTouch) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      if (e.button === 0) {
        inputRef.current.shove = true;
        sfx.whack();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);

    const inputTimer = setInterval(() => {
      const inp = inputRef.current;
      if (inp.keys.has('KeyQ')) inp.yaw += 0.06;
      if (inp.keys.has('KeyE')) inp.yaw -= 0.06;

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
        jump: inp.keys.has('Space') || inp.touchJump,
        sprint: inp.keys.has('ShiftLeft') || inp.keys.has('ShiftRight') || inp.touchSprint,
        shove: inp.shove,
      });
      inp.shove = false;
    }, 33);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const snap = snapRef.current;
      if (snap) {
        const scale = snap.arenaRadius / 20;
        arenaMesh.scale.set(scale, 1, scale);
        ringMesh.scale.set(scale, scale, 1);

        let bombHolderPos: THREE.Vector3 | null = null;
        const activeIds = new Set<string>();

        Object.values(snap.players).forEach((p) => {
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
              new THREE.BoxGeometry(1.0, 1.5, 1.0),
              new THREE.MeshLambertMaterial({ color: col })
            );
            body.position.y = 0.75;
            grp.add(body);
            scene.add(grp);
            playerMeshes.set(p.id, grp);
          }

          grp.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.35);
          grp.rotation.y = p.yaw;

          if (p.hasBomb) {
            bombHolderPos = grp.position.clone();
          }

          if (p.id === myId) {
            const camDist = 8.5;
            const cx = grp.position.x + Math.sin(inputRef.current.yaw) * camDist;
            const cz = grp.position.z + Math.cos(inputRef.current.yaw) * camDist;
            camera.position.lerp(new THREE.Vector3(cx, grp.position.y + 5.2, cz), 0.2);
            camera.lookAt(grp.position.x, grp.position.y + 1.2, grp.position.z);
          }
        });

        for (const [id, grp] of playerMeshes.entries()) {
          if (!activeIds.has(id)) {
            scene.remove(grp);
            playerMeshes.delete(id);
          }
        }

        if (bombHolderPos) {
          bombMesh.visible = true;
          const pos = bombHolderPos as THREE.Vector3;
          const pulse = 1 + Math.sin(Date.now() * 0.02) * 0.2;
          bombMesh.scale.set(pulse, pulse, pulse);
          bombMesh.position.set(pos.x, pos.y + 2.6, pos.z);
        } else {
          bombMesh.visible = false;
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
        <div className="comic-box font-arcade" style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 20 }}>
          ⏱ {snapshot?.timeRemaining ?? '--'}s
        </div>
        <div className="comic-box font-arcade" style={{ background: '#FF3B5C', color: '#fff', padding: '6px 14px', fontSize: 18 }}>
          💣 FUSE: {snapshot?.bombFuse ?? '--'}s
        </div>
      </div>

      {/* Bomb Holder Warning */}
      {me?.hasBomb && (
        <div
          className="font-arcade animate-wiggle"
          style={{
            position: 'fixed',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#FF3B5C',
            color: '#fff',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: 12,
            padding: '8px 18px',
            fontSize: 18,
            zIndex: 35,
          }}
        >
          💣 YOU HAVE THE BOMB! SHOVE SOMEONE (CLICK / F)!
        </div>
      )}

      {!showTouch && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(20,12,36,0.88)',
            border: '2px solid #000',
            borderRadius: 10,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 700,
            color: '#00E5FF',
            zIndex: 30,
          }}
        >
          CLICK TO LOCK MOUSE • WASD MOVE • SPACE JUMP • SHIFT SPRINT • CLICK / F SHOVE
        </div>
      )}

      {showTouch && (
        <TouchControls
          onMove={(x, y) => {
            inputRef.current.touchMoveX = x;
            inputRef.current.touchMoveZ = y;
          }}
          onLookDelta={(dx) => {
            inputRef.current.yaw -= dx * 0.007;
          }}
          buttons={[
            {
              id: 'shove',
              label: 'SHOVE',
              color: '#FF3B5C',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.shove = true;
                  sfx.whack();
                }
              },
            },
            {
              id: 'sprint',
              label: 'RUN',
              color: '#FFD600',
              onPressChange: (p) => {
                inputRef.current.touchSprint = p;
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
