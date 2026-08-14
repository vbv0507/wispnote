import express from 'express';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { sanitizeInput } from './middleware/sanitize.js';

import connectDB from './config/db.js';
import noteRoutes from './routes/noteRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

connectDB();

const app = express();

app.use(helmet());

app.use(morgan('tiny'));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173'
}));

app.use(express.json({ limit: '500kb' }));

app.use(sanitizeInput);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/notes', noteRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const httpServer = createServer(app);

const io = new Server(httpServer, { 
  cors: { 
    origin: process.env.FRONTEND_URL || 'http://localhost:5173' 
  } 
});

io.on('connection', (socket) => {
  socket.on('join-note', (slug) => {
    socket.join(slug);
    const room = io.sockets.adapter.rooms.get(slug);
    const socketsInRoom = room ? Array.from(room) : [socket.id];

    const userNumber = socketsInRoom.length;
    socket.data.userLabel = socket.data.userLabel || {};
    socket.data.userLabel[slug] = `User ${userNumber}`;

    socket.emit('your-label', { slug, label: socket.data.userLabel[slug] });

    const activeUsers = socketsInRoom.map((id, index) => `User ${index + 1}`);
    io.to(slug).emit('active-users', activeUsers);
  });

  socket.on('new-message', ({ slug, text, sender }) => {

    socket.to(slug).emit('message-received', { text, sender, sentAt: new Date() });
  });

  socket.on('leave-note', (slug) => {
    socket.leave(slug);
    const room = io.sockets.adapter.rooms.get(slug);
    const socketsInRoom = room ? Array.from(room) : [];
    const activeUsers = socketsInRoom.map((id, index) => `User ${index + 1}`);
    io.to(slug).emit('active-users', activeUsers);
  });

  socket.on('disconnect', () => {

  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
