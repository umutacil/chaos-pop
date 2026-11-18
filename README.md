# CHAOS POP! — Online 2D + 3D Party Madness

An online multiplayer browser party game inspired by WarioWare's chaotic arcade-pop vibe, featuring both **2D** and **3D** minigames, **FFA & Randomized Teams**, **PC + Phone controls**, **Bots**, and **Quick (1–2m) to Marathon (up to ~9m) round lengths**.

## Minigames Included
1. **STICKS & STONES (3D)** — Explosive Crossbow, Ballistic Knife, Melee lunge, and score-bankrupting Tomahawks in a 3D jump-pad arena.
2. **SUPER CHAOS SMASH (2D)** — Smash Bros-style platform brawler with % damage scaling, double jumps, directional knockback, projectiles, and ring-outs.
3. **BOMB SQUAD POTATO (3D)** — Shrinking sky-pad arena with trampolines and a ticking mega-bomb. Shove rivals and pass the bomb before it blows!

## Running Locally
```bash
npm run dev
```
- Client (Vite): `http://localhost:5173`
- Server (Socket.IO): `http://localhost:3001`

## Production Build & Single-Port Server
```bash
npm run build
npm start
```
Serves both the built React app and Socket.IO WebSocket server on port `3001` (`process.env.PORT`).
