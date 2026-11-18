import React from 'react';
import { RoomState } from '../../../shared/types';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  room: RoomState;
}

export const RoundEndOverlay: React.FC<Props> = ({ room }) => {
  const sorted = [...room.players].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(15, 8, 30, 0.94)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="font-arcade animate-pop"
        style={{
          fontSize: 'clamp(24px, 5vw, 44px)',
          color: '#FFD600',
          textShadow: '4px 4px 0 #000',
          textAlign: 'center',
          marginBottom: 20,
        }}
      >
        {room.roundWinnerText}
      </div>

      <div
        className="comic-box"
        style={{
          background: '#22163B',
          padding: 20,
          width: '100%',
          maxWidth: 540,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div className="font-arcade" style={{ fontSize: 16, color: '#00E5FF', marginBottom: 4 }}>
          STANDINGS AFTER ROUND {room.currentRound}
        </div>
        {sorted.map((p, idx) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#160D29',
              border: '2px solid #000',
              borderRadius: 12,
              padding: '8px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="font-arcade" style={{ fontSize: 18, color: idx === 0 ? '#FFD600' : '#9ca3af', width: 28 }}>
                #{idx + 1}
              </span>
              <PlayerAvatar color={p.color} accessory={p.accessory} size={36} team={p.team} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {p.name} {p.isBot && <span style={{ fontSize: 11, color: '#a78bfa' }}>(BOT)</span>}
                </div>
                <div style={{ fontSize: 12, color: '#22C55E', fontWeight: 700 }}>+{p.roundPoints} pts</div>
              </div>
            </div>
            <div className="font-arcade" style={{ fontSize: 20, color: '#FFD600' }}>
              {p.totalPoints}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
