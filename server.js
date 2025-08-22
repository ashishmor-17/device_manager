require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { connectRedis } = require('./config/redis');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Attach io to app for controllers
app.set('io', io);

// Middlewares
app.use(require('./middlewares/logger'));
app.use(express.json());
app.use(require('./middlewares/responseTime'));
app.use(require('./middlewares/queryMonitor')); // slow query monitoring
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));

// Rate Limiters
const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const deviceLimiter = rateLimit({ windowMs: 60 * 1000, max: 50 });
app.use('/auth', authLimiter);
app.use('/devices', deviceLimiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/devices', require('./routes/device'));
app.use('/health', require('./routes/health'));
app.use('/metrics', require('./routes/metrics'));
app.use('/export', require('./routes/export'));

// Background Jobs
require('./jobs/deactivateOldDevice');

// Socket.IO Authentication
const { verifyTokenSocket } = require('./middlewares/auth');
io.use((socket, next) => {
  try {
    verifyTokenSocket(socket);
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Smart Device Management API running.' });
});

// MongoDB connection with pooling
(async () => {
  try {
    await connectRedis();
    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected');

    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

// Error Handling Middleware
app.use(require('./middlewares/errorHandler'));

module.exports = app;
