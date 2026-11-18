import cors from 'cors';
import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { RoomManager } from './RoomManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'ChaosPop Server' });
});

// Serve built client if available
const clientDistCandidates = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../../../../client/dist'),
];
const clientDist = clientDistCandidates.find((p) => fs.existsSync(p));
if (clientDist) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new RoomManager(io);

io.on('connection', (socket) => {
  socket.on('room:create', (profile) => rooms.createRoom(socket, profile));
  socket.on('room:join', ({ code, profile }) => rooms.joinRoom(socket, code, profile));
  socket.on('room:leave', () => rooms.leaveCurrentRoom(socket));
  socket.on('room:profile', (profile) => rooms.updateProfile(socket, profile));
  socket.on('room:settings', (settings) => rooms.updateSettings(socket, settings));
  socket.on('room:addBot', () => rooms.addBot(socket));
  socket.on('room:removeBot', (botId) => rooms.removeBot(socket, botId));
  socket.on('room:start', (forcedGameId) => rooms.startParty(socket, forcedGameId));
  socket.on('room:lobby', () => rooms.returnToLobby(socket));
  socket.on('game:input', (input) => rooms.handleGameInput(socket, input));

  socket.on('disconnect', () => {
    rooms.leaveCurrentRoom(socket);
  });
});

const PORT = Number(process.env.PORT) || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`ChaosPop server running on http://localhost:${PORT}`);
});
