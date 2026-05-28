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
    const { title, date, courtCount, level, levels, price, maxSlots } = req.body;
    const sessionLevels = Array.isArray(levels) ? levels : (level ? [level] : []);
    const levelStr = sessionLevels.join(', ') || 'Chưa chọn';

    const newSession = new Session({ 
      title, 
      date, 
      courtCount, 
      level: levelStr, 
      levels: sessionLevels,
      price, 
      maxSlots 
    });
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
    const { name, phone, level, levels, slots } = req.body;
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ error: 'Không tìm thấy buổi giao lưu này' });
    }

    // 1. Validate Name
    const nameClean = (name || '').trim();
    if (nameClean.length < 2 || nameClean.length > 50) {
      return res.status(400).json({ error: 'Họ và tên phải từ 2 đến 50 ký tự!' });
    }
    const hasInvalidChars = /[\d`~!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(nameClean);
    if (hasInvalidChars) {
      return res.status(400).json({ error: 'Họ và tên không được chứa số hoặc ký tự đặc biệt!' });
    }

    // 2. Validate Phone
    const phoneClean = (phone || '').trim();
    const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      return res.status(400).json({ error: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam (ví dụ: 0987654321).' });
    }

    // 3. Validate Slots
    const numSlots = parseInt(slots) || 1;
    if (numSlots < 1 || numSlots > 5) {
      return res.status(400).json({ error: 'Mỗi lần đăng ký chỉ được chọn từ 1 đến 5 slot!' });
    }

    // 4. Check slot capacity
    const currentSlots = session.registeredMembers.reduce((sum, m) => sum + (m.slots || 1), 0);
    if (currentSlots + numSlots > session.maxSlots) {
      const slotsLeft = session.maxSlots - currentSlots;
      return res.status(400).json({ error: `Không đủ chỗ! Chỉ còn lại ${slotsLeft} slot trống cho buổi này.` });
    }
    
    // 5. Check duplicate phone number
    const isDuplicate = session.registeredMembers.some(m => m.phone === phoneClean);
    if (isDuplicate) {
      return res.status(400).json({ error: 'Số điện thoại này đã được đăng ký cho buổi này!' });
    }

    const guestLevels = Array.isArray(levels) ? levels : (level ? [level] : []);
    const guestLevelStr = guestLevels.join(', ') || 'Không xác định';

    session.registeredMembers.push({ 
      name: nameClean, 
      phone: phoneClean, 
      level: guestLevelStr,
      levels: guestLevels,
      slots: numSlots
    });
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
