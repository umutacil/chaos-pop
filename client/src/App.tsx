import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GAME_CATALOG, GameEvent, RoomState } from '../../shared/types';
import { ComicFeed } from './components/ComicFeed';
import { GameIntroOverlay } from './components/GameIntroOverlay';
import { HomeLobby } from './components/HomeLobby';
import { PodiumScreen } from './components/PodiumScreen';
import { RoundEndOverlay } from './components/RoundEndOverlay';
import { Arena3DView } from './games/Arena3DView';
import { BombTag3D } from './games/BombTag3D';
import { Platform2DView } from './games/Platform2DView';
import { Shooter3DView } from './games/Shooter3DView';
import { SmashBrawler2D } from './games/SmashBrawler2D';
import { SticksAndStones3D } from './games/SticksAndStones3D';
import { TopDown2DView } from './games/TopDown2DView';
import { sfx } from './utils/sound';
import { Gamepad2, Volume2, VolumeX } from 'lucide-react';

export function App() {
  const socketRef = useRef<Socket | null>(null);
  const [myId, setMyId] = useState('');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<any>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [muted, setMuted] = useState(false);
  const [showTouch, setShowTouch] = useState(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setMyId(socket.id || '');
    });

    socket.on('room:state', (nextRoom: RoomState) => {
      setRoom((prev) => {
        if (prev?.phase !== 'intro' && nextRoom.phase === 'intro') {
          sfx.intro();
          setSnapshot(null);
          setEvents([]);
        }
        if (prev?.phase !== 'podium' && nextRoom.phase === 'podium') {
          sfx.fanfare();
        }
        return nextRoom;
      });
      setError('');
    });

    socket.on('room:error', (msg: string) => {
      setError(msg);
    });

    socket.on('game:snapshot', (snap: any) => {
      setSnapshot(snap);
    });

    socket.on('game:events', (incoming: GameEvent[]) => {
      incoming.forEach((ev) => {
        if (ev.type === 'bankrupt') sfx.bankrupt();
        else if (ev.type === 'explosion' || ev.type === 'bomb_boom') sfx.explosion();
        else if (ev.type === 'ko') sfx.ko();
        else if (ev.type === 'smash') sfx.whack();
        else if (ev.type === 'bomb_pass') sfx.pass();
      });
      setEvents((prev) => [...prev.slice(-6), ...incoming]);
      setTimeout(() => {
        setEvents((prev) => prev.filter((e) => !incoming.some((x) => x.id === e.id)));
      }, 2800);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    sfx.muted = next;
  };

  const emit = (ev: string, payload?: any) => {
    socketRef.current?.emit(ev, payload);
  };

  const me = room?.players.find((p) => p.id === myId);

  return (
    <div style={{ width: '100%', minHeight: '100vh', position: 'relative' }}>
      {/* Top-Right Utility Controls */}
      <div
        style={{
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 60,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          type="button"
          className="comic-btn"
          onClick={() => setShowTouch((v) => !v)}
          title="Toggle Touch Controls"
          style={{
            background: showTouch ? '#00E5FF' : '#22163B',
            color: showTouch ? '#000' : '#fff',
            padding: '6px 10px',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Gamepad2 size={15} />
          {showTouch ? 'TOUCH ON' : 'PC'}
        </button>

        <button
          type="button"
          className="comic-btn"
          onClick={toggleMute}
          title="Toggle Sound"
          style={{
            background: muted ? '#FF3B5C' : '#FFD600',
            color: muted ? '#fff' : '#000',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {room && room.phase === 'playing' && me?.isHost && (
          <button
            type="button"
            className="comic-btn"
            onClick={() => emit('room:lobby')}
            style={{ background: '#FF3B5C', color: '#fff', padding: '6px 10px', fontSize: 11 }}
          >
            LOBBY
          </button>
        )}
      </div>

      {/* Main View Router */}
      {(!room || room.phase === 'lobby') && (
        <HomeLobby
          room={room}
          myId={myId}
          error={error}
          onCreateRoom={(profile) => emit('room:create', profile)}
          onJoinRoom={(code, profile) => emit('room:join', { code, profile })}
          onUpdateProfile={(profile) => emit('room:profile', profile)}
          onUpdateSettings={(settings) => emit('room:settings', settings)}
          onAddBot={() => emit('room:addBot')}
          onRemoveBot={(id) => emit('room:removeBot', id)}
          onStartParty={(forcedGameId) => emit('room:start', forcedGameId)}
          onLeaveRoom={() => {
            emit('room:leave');
            setRoom(null);
          }}
        />
      )}

      {room && room.phase === 'intro' && <GameIntroOverlay room={room} isMobile={showTouch} />}

      {room && room.phase === 'playing' && room.currentGame && (
        <>
          <ComicFeed events={events} />
          {room.currentGame === 'sticks_and_stones' && (
            <SticksAndStones3D
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {room.currentGame === 'smash_brawler' && (
            <SmashBrawler2D
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {room.currentGame === 'bomb_tag' && (
            <BombTag3D
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {GAME_CATALOG[room.currentGame].engine === 'topdown2d' && (
            <TopDown2DView
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {GAME_CATALOG[room.currentGame].engine === 'platform2d' && (
            <Platform2DView
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {GAME_CATALOG[room.currentGame].engine === 'arena3d' && (
            <Arena3DView
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
          {GAME_CATALOG[room.currentGame].engine === 'shooter3d' && (
            <Shooter3DView
              room={room}
              myId={myId}
              snapshot={snapshot}
              showTouch={showTouch}
              onSendInput={(inp) => emit('game:input', inp)}
            />
          )}
        </>
      )}

      {room && room.phase === 'round_end' && <RoundEndOverlay room={room} />}

      {room && room.phase === 'podium' && (
        <PodiumScreen
          room={room}
          myId={myId}
          onPlayAgain={() => emit('room:start')}
          onBackToLobby={() => emit('room:lobby')}
        />
      )}
    </div>
  );
}

export default App;
