import React from 'react';
import { GAME_CATALOG, RoomState } from '../../../shared/types';

interface Props {
  room: RoomState;
  isMobile: boolean;
}

export const GameIntroOverlay: React.FC<Props> = ({ room, isMobile }) => {
  if (!room.currentGame) return null;
  const meta = GAME_CATALOG[room.currentGame];
  const isTeams = room.currentTeamMode === 'teams';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'radial-gradient(circle, rgba(35,16,74,0.96) 0%, rgba(12,6,24,0.99) 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
      }}
    >
      <div
        className="animate-pop"
        style={{
          background: '#FFD600',
          color: '#000',
          border: '4px solid #000',
          boxShadow: '6px 6px 0 #000',
          borderRadius: 999,
          padding: '6px 22px',
          fontSize: 15,
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        ROUND {room.currentRound} OF {room.settings.totalRounds} • GET READY!
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          className="font-arcade"
          style={{
            background: meta.dimension === '3D' ? '#00E5FF' : '#A855F7',
            color: '#000',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: 10,
            padding: '6px 14px',
            fontSize: 16,
          }}
        >
          {meta.dimension} GAME
        </span>

        <span
          className="font-arcade"
          style={{
            background: isTeams ? '#FF3B5C' : '#22C55E',
            color: isTeams ? '#fff' : '#000',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: 10,
            padding: '6px 14px',
            fontSize: 16,
          }}
        >
          {isTeams ? 'RED vs BLUE TEAMS!' : 'FREE FOR ALL!'}
        </span>
      </div>

      <h1
        className="font-arcade animate-wiggle"
        style={{
          fontSize: 'clamp(34px, 7vw, 68px)',
          color: meta.accent,
          textShadow: '5px 5px 0 #000, -2px -2px 0 #000',
          margin: '4px 0 10px',
          lineHeight: 1.05,
        }}
      >
        {meta.title}
      </h1>

      <p style={{ fontSize: 18, maxWidth: 620, color: '#f3f4f6', fontWeight: 700, marginBottom: 22 }}>
        {meta.tagline}
      </p>

      <div
        className="comic-box"
        style={{
          background: '#1E1238',
          padding: '12px 20px',
          maxWidth: 680,
          fontSize: 14,
          color: '#FFD600',
          fontWeight: 700,
        }}
      >
        🎮 CONTROLS: {isMobile ? meta.controlsMobile : meta.controlsPC}
      </div>
    </div>
  );
};
