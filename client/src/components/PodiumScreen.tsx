import React from 'react';
import { RoomState } from '../../../shared/types';
import { PlayerAvatar } from './PlayerAvatar';
import { sfx } from '../utils/sound';

interface Props {
  room: RoomState;
  myId: string;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const PodiumScreen: React.FC<Props> = ({ room, myId, onPlayAgain, onBackToLobby }) => {
  const sorted = [...room.players].sort((a, b) => b.totalPoints - a.totalPoints);
  const me = room.players.find((p) => p.id === myId);
  const winner = sorted[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        className="font-arcade animate-wiggle"
        style={{
          fontSize: 'clamp(32px, 6vw, 56px)',
          color: '#FFD600',
          textShadow: '5px 5px 0 #000',
          marginBottom: 8,
        }}
      >
        👑 PARTY CHAMPION! 👑
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#00E5FF', marginBottom: 28 }}>
        {winner?.name} takes the crown with {winner?.totalPoints} pts!
      </div>

      <div
        className="comic-box"
        style={{
          background: '#22163B',
          padding: 22,
          width: '100%',
          maxWidth: 620,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 24,
        }}
      >
        {sorted.map((p, idx) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: idx === 0 ? 'rgba(255, 214, 0, 0.16)' : '#160D29',
              border: idx === 0 ? '3px solid #FFD600' : '2px solid #000',
              borderRadius: 12,
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="font-arcade" style={{ fontSize: 22, color: idx === 0 ? '#FFD600' : '#9ca3af', width: 34 }}>
                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
              </span>
              <PlayerAvatar color={p.color} accessory={p.accessory} size={44} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {p.name} {p.id === myId && <span style={{ color: '#00E5FF' }}>(YOU)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  KOs: {p.stats.kos} • Bankrupts: {p.stats.bankrupts} • Wins: {p.stats.wins}
                </div>
              </div>
            </div>
            <div className="font-arcade" style={{ fontSize: 24, color: '#FFD600' }}>
              {p.totalPoints}
            </div>
          </div>
        ))}
      </div>

      {me?.isHost ? (
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="comic-btn"
            style={{ background: '#22C55E', color: '#000', padding: '14px 28px', fontSize: 18 }}
            onClick={() => {
              sfx.click();
              onPlayAgain();
            }}
          >
            PLAY AGAIN!
          </button>
          <button
            className="comic-btn"
            style={{ background: '#00E5FF', color: '#000', padding: '14px 28px', fontSize: 18 }}
            onClick={() => {
              sfx.click();
              onBackToLobby();
            }}
          >
            BACK TO LOBBY
          </button>
        </div>
      ) : (
        <div style={{ color: '#cbd5e1', fontWeight: 700 }}>Waiting for host to start next party...</div>
      )}
    </div>
  );
};
