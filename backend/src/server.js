const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const Session = require('./models/Session');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "DELETE"]
  }
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dockertest';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectWithRetry = () => {
  console.log('Connecting to MongoDB...');
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected Successfully!');
    })
    .catch((err) => {
      console.error('MongoDB connection error, retrying in 5 seconds...', err.message);
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Socket.io connection logging
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper function to broadcast updates
const broadcastUpdate = () => {
  io.emit('sessionsUpdated');
};

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to Badminton Management API!' });
});

// GET all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const sessions = await Session.find().sort({ date: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { title, date, courtCount, level, price, maxSlots } = req.body;
    const newSession = new Session({ title, date, courtCount, level, price, maxSlots });
    const savedSession = await newSession.save();
    
    broadcastUpdate(); // Emit socket event
    res.status(201).json(savedSession);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a session
app.delete('/api/sessions/:id', async (req, res) => {
  try {
    const deletedSession = await Session.findByIdAndDelete(req.params.id);
    if (!deletedSession) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    broadcastUpdate(); // Emit socket event
    res.json({ success: true, deletedSession });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST register for a session
app.post('/api/sessions/:id/register', async (req, res) => {
  try {
    const { name, phone, level } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Không tìm thấy buổi giao lưu này' });
    }

    if (session.registeredMembers.length >= session.maxSlots) {
      return res.status(400).json({ error: 'Đã hết slot cho buổi này!' });
    }
    
    // Check duplicate phone number
    const isDuplicate = session.registeredMembers.some(m => m.phone === phone);
    if (isDuplicate) {
      return res.status(400).json({ error: 'Số điện thoại này đã được đăng ký cho buổi này!' });
    }

    session.registeredMembers.push({ name, phone, level: level || 'Không xác định' });
    await session.save();
    
    broadcastUpdate(); // Emit socket event
    res.status(200).json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove a member from a session
app.delete('/api/sessions/:id/members/:phone', async (req, res) => {
  try {
    const { id, phone } = req.params;
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Filter out the member with the given phone
    session.registeredMembers = session.registeredMembers.filter(m => m.phone !== phone);
    await session.save();
    
    broadcastUpdate(); // Emit socket event
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server using http server instead of app directly
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
