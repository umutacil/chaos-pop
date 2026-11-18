import React from 'react';
import { AccessoryId } from '../../../shared/types';

interface Props {
  color: string;
  accessory: AccessoryId;
  size?: number;
  team?: 'red' | 'blue' | null;
}

export const PlayerAvatar: React.FC<Props> = ({ color, accessory, size = 48, team }) => {
  const borderColor = team === 'red' ? '#FF2E4C' : team === 'blue' ? '#00B8FF' : '#000000';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '14px',
        backgroundColor: color,
        border: `3px solid ${borderColor}`,
        boxShadow: '3px 3px 0 #000',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Accessory Top */}
      {accessory === 'crown' && (
        <div
          style={{
            position: 'absolute',
            top: -size * 0.34,
            fontSize: size * 0.45,
            filter: 'drop-shadow(1px 1px 0 #000)',
          }}
        >
          👑
        </div>
      )}
      {accessory === 'halo' && (
        <div
          style={{
            position: 'absolute',
            top: -size * 0.24,
            width: size * 0.65,
            height: size * 0.18,
            borderRadius: '999px',
            border: '3px solid #FFD600',
            boxShadow: '0 0 6px #FFD600',
          }}
        />
      )}
      {accessory === 'horns' && (
        <div
          style={{
            position: 'absolute',
            top: -size * 0.26,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 4px',
            fontSize: size * 0.35,
          }}
        >
          <span>😈</span>
        </div>
      )}

      {/* Googly Eyes */}
      <div style={{ display: 'flex', gap: size * 0.12, marginTop: -size * 0.08 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            style={{
              width: size * 0.24,
              height: size * 0.28,
              borderRadius: '999px',
              background: '#fff',
              border: '2px solid #000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: size * 0.11,
                height: size * 0.11,
                borderRadius: '999px',
                background: '#000',
              }}
            />
          </div>
        ))}
      </div>

      {/* Shades */}
      {accessory === 'shades' && (
        <div
          style={{
            position: 'absolute',
            top: size * 0.22,
            width: size * 0.78,
            height: size * 0.24,
            background: '#111',
            borderRadius: '4px',
            border: '2px solid #fff',
          }}
        />
      )}

      {/* Mustache */}
      {accessory === 'mustache' && (
        <div
          style={{
            position: 'absolute',
            bottom: size * 0.12,
            width: size * 0.56,
            height: size * 0.16,
            background: '#1a1a1a',
            borderRadius: '999px',
          }}
        />
      )}
    </div>
  );
};
