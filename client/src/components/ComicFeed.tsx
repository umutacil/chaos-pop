import React from 'react';
import { GameEvent } from '../../../shared/types';

interface Props {
  events: GameEvent[];
}

export const ComicFeed: React.FC<Props> = ({ events }) => {
  if (events.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 68,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'none',
      }}
    >
      {events.slice(-3).map((ev) => (
        <div
          key={ev.id}
          className="animate-pop"
          style={{
            background: ev.color || '#FFD600',
            color: '#000',
            border: '3px solid #000',
            boxShadow: '4px 4px 0 #000',
            borderRadius: 12,
            padding: '4px 14px',
            textAlign: 'center',
          }}
        >
          <div className="font-arcade" style={{ fontSize: 18, lineHeight: 1.1 }}>
            {ev.text}
          </div>
          {ev.subtext && (
            <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2 }}>{ev.subtext}</div>
          )}
        </div>
      ))}
    </div>
  );
};
