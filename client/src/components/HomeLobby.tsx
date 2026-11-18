import React, { useState } from 'react';
import {
  AccessoryId,
  DurationPreset,
  GAME_CATALOG,
  GameId,
  RoomSettings,
  RoomState,
  TeamSetting,
} from '../../../shared/types';
import { PlayerAvatar } from './PlayerAvatar';
import { sfx } from '../utils/sound';
import { Bot, Copy, Crown, Play, Plus, Trash2, Users } from 'lucide-react';

const COLORS = ['#FF3B5C', '#00E5FF', '#FFD600', '#22C55E', '#A855F7', '#FF6B00', '#EC4899'];
const ACCESSORIES: { id: AccessoryId; label: string }[] = [
  { id: 'shades', label: '😎 Shades' },
  { id: 'crown', label: '👑 Crown' },
  { id: 'horns', label: '😈 Horns' },
  { id: 'mustache', label: '🥸 Stache' },
  { id: 'halo', label: '😇 Halo' },
  { id: 'none', label: '🙂 Plain' },
];

interface Props {
  room: RoomState | null;
  myId: string;
  error: string;
  onCreateRoom: (profile: { name: string; color: string; accessory: AccessoryId }) => void;
  onJoinRoom: (code: string, profile: { name: string; color: string; accessory: AccessoryId }) => void;
  onUpdateProfile: (profile: { name: string; color: string; accessory: AccessoryId }) => void;
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onAddBot: () => void;
  onRemoveBot: (id: string) => void;
  onStartParty: (forcedGameId?: GameId) => void;
  onLeaveRoom: () => void;
}

export const HomeLobby: React.FC<Props> = ({
  room,
  myId,
  error,
  onCreateRoom,
  onJoinRoom,
  onUpdateProfile,
  onUpdateSettings,
  onAddBot,
  onRemoveBot,
  onStartParty,
  onLeaveRoom,
}) => {
  const [name, setName] = useState('Player');
  const [color, setColor] = useState(COLORS[Math.floor(Math.random() * COLORS.length)]);
  const [accessory, setAccessory] = useState<AccessoryId>('shades');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const me = room?.players.find((p) => p.id === myId);
  const isHost = Boolean(me?.isHost);

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code).catch(() => {});
    setCopied(true);
    sfx.click();
    setTimeout(() => setCopied(false), 1500);
  };

  if (!room) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div className="animate-wiggle" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'inline-block',
              background: '#FFD600',
              color: '#000',
              border: '3px solid #000',
              boxShadow: '4px 4px 0 #000',
              borderRadius: 999,
              padding: '4px 16px',
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            2D + 3D ONLINE MULTIPLAYER CHAOS
          </div>
          <h1
            className="font-arcade"
            style={{
              fontSize: 'clamp(42px, 8vw, 76px)',
              margin: 0,
              color: '#FF3B5C',
              textShadow: '6px 6px 0 #000, -2px -2px 0 #FFD600',
              lineHeight: 1,
            }}
          >
            CHAOS POP!
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: 16, fontWeight: 700, marginTop: 8 }}>
            Sticks & Stones • Super Chaos Smash • Bomb Squad Potato
          </p>
        </div>

        <div
          className="comic-box"
          style={{
            background: '#22163B',
            padding: 24,
            width: '100%',
            maxWidth: 460,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Avatar Preview & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <PlayerAvatar color={color} accessory={accessory} size={62} />
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#FFD600', display: 'block', marginBottom: 4 }}>
                YOUR NICKNAME
              </label>
              <input
                value={name}
                maxLength={14}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter nickname..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '3px solid #000',
                  background: '#140C24',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 16,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00E5FF', marginBottom: 6 }}>COLOR</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setColor(c);
                  }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: c,
                    border: color === c ? '3px solid #fff' : '3px solid #000',
                    boxShadow: '2px 2px 0 #000',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Accessory Picker */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#00E5FF', marginBottom: 6 }}>STYLE</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {ACCESSORIES.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    setAccessory(acc.id);
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 10,
                    border: '2px solid #000',
                    background: accessory === acc.id ? '#FFD600' : '#140C24',
                    color: accessory === acc.id ? '#000' : '#fff',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div
              style={{
                background: '#FF3B5C',
                color: '#fff',
                border: '2px solid #000',
                borderRadius: 10,
                padding: '8px 12px',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="comic-btn"
            style={{ background: '#22C55E', color: '#000', padding: '14px', fontSize: 18 }}
            onClick={() => {
              sfx.click();
              onCreateRoom({ name, color, accessory });
            }}
          >
            CREATE PARTY ROOM
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={joinCode}
              maxLength={6}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: 10,
                border: '3px solid #000',
                background: '#140C24',
                color: '#FFD600',
                fontFamily: 'Bungee, sans-serif',
                fontSize: 16,
                textAlign: 'center',
                outline: 'none',
              }}
            />
            <button
              className="comic-btn"
              style={{ background: '#00E5FF', color: '#000', padding: '10px 20px', fontSize: 16 }}
              onClick={() => {
                sfx.click();
                onJoinRoom(joinCode, { name, color, accessory });
              }}
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- IN ROOM LOBBY ----
  return (
    <div style={{ minHeight: '100vh', padding: '20px 16px', maxWidth: 1060, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1 className="font-arcade" style={{ margin: 0, fontSize: 30, color: '#FFD600', textShadow: '3px 3px 0 #000' }}>
            CHAOS POP! LOBBY
          </h1>
          <div style={{ fontSize: 13, color: '#cbd5e1', fontWeight: 700 }}>
            Share the room code with friends on PC or Phone!
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="comic-btn"
            onClick={copyCode}
            style={{
              background: '#FFD600',
              color: '#000',
              padding: '8px 16px',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>CODE: {room.code}</span>
            <Copy size={18} />
            {copied && <span style={{ fontSize: 11 }}>COPIED!</span>}
          </button>
          <button
            className="comic-btn"
            onClick={onLeaveRoom}
            style={{ background: '#FF3B5C', color: '#fff', padding: '10px 14px', fontSize: 13 }}
          >
            LEAVE
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: 18,
        }}
      >
        {/* Players Column */}
        <div className="comic-box" style={{ background: '#22163B', padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="font-arcade" style={{ fontSize: 18, color: '#00E5FF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={20} /> PLAYERS ({room.players.length}/10)
            </div>
            {isHost && (
              <button
                className="comic-btn"
                onClick={() => {
                  sfx.click();
                  onAddBot();
                }}
                style={{
                  background: '#A855F7',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Plus size={14} /> ADD BOT
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {room.players.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: p.id === myId ? 'rgba(0,229,255,0.14)' : '#140C24',
                  border: p.id === myId ? '2px solid #00E5FF' : '2px solid #000',
                  borderRadius: 12,
                  padding: '8px 12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PlayerAvatar color={p.color} accessory={p.accessory} size={40} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {p.name}
                      {p.isHost && <Crown size={15} color="#FFD600" />}
                      {p.isBot && <Bot size={15} color="#A855F7" />}
                      {p.id === myId && <span style={{ fontSize: 11, color: '#00E5FF' }}>(YOU)</span>}
                    </div>
                  </div>
                </div>

                {isHost && p.isBot && (
                  <button
                    type="button"
                    onClick={() => onRemoveBot(p.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#FF3B5C',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick style switcher for self */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '2px dashed rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#FFD600', marginBottom: 6 }}>CHANGE YOUR COLOR</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    if (me) onUpdateProfile({ name: me.name, color: c, accessory: me.accessory });
                  }}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: c,
                    border: me?.color === c ? '2px solid #fff' : '2px solid #000',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Playlist Settings & Launch Column */}
        <div className="comic-box" style={{ background: '#22163B', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="font-arcade" style={{ fontSize: 18, color: '#FFD600' }}>
            PARTY SETTINGS
          </div>

          {/* Rounds */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>ROUNDS IN PLAYLIST</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[3, 5, 7].map((r) => (
                <button
                  key={r}
                  disabled={!isHost}
                  className="comic-btn"
                  onClick={() => {
                    sfx.click();
                    onUpdateSettings({ totalRounds: r });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: room.settings.totalRounds === r ? '#FFD600' : '#140C24',
                    color: room.settings.totalRounds === r ? '#000' : '#fff',
                    fontSize: 14,
                  }}
                >
                  {r} ROUNDS
                </button>
              ))}
            </div>
          </div>

          {/* Match Duration */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>ROUND LENGTH</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(
                [
                  { id: 'quick', label: 'QUICK (1-2m)' },
                  { id: 'standard', label: 'STD (3-4m)' },
                  { id: 'marathon', label: 'LONG (7-9m)' },
                ] as { id: DurationPreset; label: string }[]
              ).map((d) => (
                <button
                  key={d.id}
                  disabled={!isHost}
                  className="comic-btn"
                  onClick={() => {
                    sfx.click();
                    onUpdateSettings({ durationPreset: d.id });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: room.settings.durationPreset === d.id ? '#00E5FF' : '#140C24',
                    color: room.settings.durationPreset === d.id ? '#000' : '#fff',
                    fontSize: 11,
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Team Mode */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>FFA / TEAMS</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(
                [
                  { id: 'random', label: 'RANDOMIZE' },
                  { id: 'ffa', label: 'ALL FFA' },
                  { id: 'teams', label: 'TEAMS' },
                ] as { id: TeamSetting; label: string }[]
              ).map((t) => (
                <button
                  key={t.id}
                  disabled={!isHost}
                  className="comic-btn"
                  onClick={() => {
                    sfx.click();
                    onUpdateSettings({ teamSetting: t.id });
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    background: room.settings.teamSetting === t.id ? '#FF3B5C' : '#140C24',
                    color: '#fff',
                    fontSize: 12,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enabled Games + Quick Jump */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 6 }}>
              MINIGAME POOL (OR LAUNCH ONE NOW)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(Object.keys(GAME_CATALOG) as GameId[]).map((gid) => {
                const g = GAME_CATALOG[gid];
                const enabled = room.settings.enabledGames.includes(gid);
                return (
                  <div
                    key={gid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#140C24',
                      border: '2px solid #000',
                      borderRadius: 10,
                      padding: '8px 10px',
                      gap: 8,
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: isHost ? 'pointer' : 'default', flex: 1 }}>
                      <input
                        type="checkbox"
                        disabled={!isHost}
                        checked={enabled}
                        onChange={() => {
                          const next = enabled
                            ? room.settings.enabledGames.filter((x) => x !== gid)
                            : [...room.settings.enabledGames, gid];
                          onUpdateSettings({ enabledGames: next });
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          background: g.dimension === '3D' ? '#00E5FF' : '#A855F7',
                          color: '#000',
                          padding: '2px 6px',
                          borderRadius: 6,
                        }}
                      >
                        {g.dimension}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{g.title}</span>
                    </label>
                    {isHost && (
                      <button
                        className="comic-btn"
                        onClick={() => {
                          sfx.intro();
                          onStartParty(gid);
                        }}
                        style={{ background: g.accent, color: '#000', padding: '4px 10px', fontSize: 11 }}
                      >
                        PLAY
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isHost ? (
            <button
              className="comic-btn"
              onClick={() => {
                sfx.intro();
                onStartParty();
              }}
              style={{
                background: '#22C55E',
                color: '#000',
                padding: '16px',
                fontSize: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginTop: 'auto',
              }}
            >
              <Play size={22} fill="#000" /> START PARTY PLAYLIST!
            </button>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: 14,
                background: '#140C24',
                borderRadius: 12,
                border: '2px solid #000',
                color: '#FFD600',
                fontWeight: 700,
              }}
            >
              Waiting for Host to start the chaos...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
