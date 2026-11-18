import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Arena3DInput, Arena3DSnapshot, GAME_CATALOG, RoomState } from '../../../shared/types';
import { TouchControls } from '../components/TouchControls';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  snapshot: Arena3DSnapshot | null;
  showTouch: boolean;
  onSendInput: (input: Arena3DInput) => void;
}

export const Arena3DView: React.FC<Props> = ({ room, myId, snapshot, showTouch, onSendInput }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const snapRef = useRef<Arena3DSnapshot | null>(snapshot);
  snapRef.current = snapshot;
  const roomRef = useRef(room);
  roomRef.current = room;

  const inputRef = useRef({
    keys: new Set<string>(),
    touchMoveX: 0,
    touchMoveZ: 0,
    yaw: 0,
    action: false,
    touchJump: false,
    touchSprint: false,
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x130b29);
    scene.fog = new THREE.Fog(0x130b29, 28, 82);

    const camera = new THREE.PerspectiveCamera(70, container.clientWidth / container.clientHeight, 0.1, 150);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(16, 32, 16);
    scene.add(dirLight);

    // Main circular platform (hidden in tiled modes)
    const arenaMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(18, 18, 1.2, 40),
      new THREE.MeshLambertMaterial({ color: 0x2a1852 })
    );
    arenaMesh.position.y = -0.6;
    scene.add(arenaMesh);

    // Sweeper bar
    const sweeperBar = new THREE.Mesh(
      new THREE.BoxGeometry(36, 1.0, 1.2),
      new THREE.MeshBasicMaterial({ color: 0xff3b5c })
    );
    sweeperBar.position.y = 0.6;
    sweeperBar.visible = false;
    scene.add(sweeperBar);

    // Golden Crown
    const crownMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: 0xffd600 })
    );
    crownMesh.visible = false;
    scene.add(crownMesh);

    const tileMeshes = new Map<string, THREE.Mesh>();
    const hazMeshes = new Map<string, THREE.Mesh>();
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
        inputRef.current.action = true;
        sfx.whack();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => inputRef.current.keys.delete(e.code);
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        inputRef.current.yaw -= e.movementX * 0.0025;
      }
    };
    const onMouseDown = () => {
      if (showTouch) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock?.();
        return;
      }
      inputRef.current.action = true;
      sfx.whack();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);

    const timer = setInterval(() => {
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
        action: inp.action,
      });
      inp.action = false;
    }, 33);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const snap = snapRef.current;
      if (snap) {
        const isTiled = snap.mode === '3d_hex_fall' || snap.mode === '3d_color_drop';
        arenaMesh.visible = !isTiled;
        arenaMesh.scale.set(snap.arenaRadius / 18, 1, snap.arenaRadius / 18);

        if (snap.mode === '3d_ice_slip') {
          (arenaMesh.material as THREE.MeshLambertMaterial).color.setHex(0x38bdf8);
        }

        sweeperBar.visible = snap.mode === '3d_sweeper';
        sweeperBar.rotation.y = -snap.sweeperAngle;

        if (snap.crownPos) {
          crownMesh.visible = true;
          crownMesh.position.set(snap.crownPos.x, snap.crownPos.y + Math.sin(Date.now() * 0.005) * 0.3, snap.crownPos.z);
          crownMesh.rotation.y += 0.05;
        } else {
          crownMesh.visible = false;
        }

        // Tiles
        snap.tiles.forEach((t) => {
          let tm = tileMeshes.get(t.id);
          if (!tm) {
            const size = snap.mode === '3d_hex_fall' ? 3.8 : 4.8;
            tm = new THREE.Mesh(
              new THREE.BoxGeometry(size, 0.6, size),
              new THREE.MeshLambertMaterial({ color: t.color })
            );
            tm.position.set(t.x, -0.3, t.z);
            scene.add(tm);
            tileMeshes.set(t.id, tm);
          }
          tm.visible = t.alive;
          (tm.material as THREE.MeshLambertMaterial).color.set(t.color);
        });

        // Hazards
        const activeHaz = new Set<string>();
        snap.hazards.forEach((h) => {
          activeHaz.add(h.id);
          let hm = hazMeshes.get(h.id);
          if (!hm) {
            const geo =
              h.kind === 'warning'
                ? new THREE.CylinderGeometry(h.r, h.r, 0.2, 20)
                : new THREE.SphereGeometry(h.r, 14, 14);
            hm = new THREE.Mesh(
              geo,
              new THREE.MeshBasicMaterial({ color: h.kind === 'warning' ? 0xff3b5c : 0xff6b00 })
            );
            scene.add(hm);
            hazMeshes.set(h.id, hm);
          }
          hm.position.set(h.x, h.y, h.z);
        });
        for (const [id, hm] of hazMeshes.entries()) {
          if (!activeHaz.has(id)) {
            scene.remove(hm);
            hazMeshes.delete(id);
          }
        }

        // Players
        Object.values(snap.players).forEach((p) => {
          let grp = playerMeshes.get(p.id);
          if (!grp) {
            const prof = roomRef.current.players.find((x) => x.id === p.id);
            grp = new THREE.Group();
            const body = new THREE.Mesh(
              new THREE.BoxGeometry(1.0, 1.5, 1.0),
              new THREE.MeshLambertMaterial({ color: prof?.color || '#FFD600' })
            );
            body.position.y = 0.75;
            grp.add(body);
            scene.add(grp);
            playerMeshes.set(p.id, grp);
          }
          grp.visible = p.alive;
          grp.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.35);
          grp.rotation.y = p.yaw;

          if (p.hasCrown) {
            crownMesh.visible = true;
            crownMesh.position.set(grp.position.x, grp.position.y + 2.4, grp.position.z);
          }

          if (p.id === myId) {
            const camDist = 9;
            const cx = grp.position.x + Math.sin(inputRef.current.yaw) * camDist;
            const cz = grp.position.z + Math.cos(inputRef.current.yaw) * camDist;
            camera.position.lerp(new THREE.Vector3(cx, grp.position.y + 5.5, cz), 0.2);
            camera.lookAt(grp.position.x, grp.position.y + 1.2, grp.position.z);
          }
        });
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
          display: 'flex',
          gap: 10,
        }}
      >
        <div className="comic-box font-arcade" style={{ background: '#FFD600', color: '#000', padding: '6px 16px', fontSize: 18 }}>
          ⏱ {snapshot?.timeRemaining ?? '--'}s • {title}
        </div>
        {snapshot?.targetColor && (
          <div
            className="comic-box font-arcade"
            style={{ background: snapshot.targetColor, color: '#000', padding: '6px 16px', fontSize: 18 }}
          >
            STAND ON THIS COLOR!
          </div>
        )}
      </div>

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
              id: 'act',
              label: 'SHOVE',
              color: '#FF3B5C',
              onPressChange: (p) => {
                if (p) {
                  inputRef.current.action = true;
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
