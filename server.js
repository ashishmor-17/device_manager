require('dotenv').config();
const express = require('express');
const http = require('http'); // Add this
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectRedis } = require('./config/redis');

const app = express();
const server = http.createServer(app); // Wrap Express app
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

app.set('io', io); // Make io accessible in controllers

app.use(require('./middlewares/logger'));
app.use(express.json());
app.use(require('./middlewares/responseTime'));
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'] }));

// Rate Limiters
const authLimiter = rateLimit({ windowMs: 60*1000, max: 10 });
const deviceLimiter = rateLimit({ windowMs: 60*1000, max: 50 });
app.use('/auth', authLimiter);
app.use('/devices', deviceLimiter);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/devices', require('./routes/device'));

// Background Job
require('./jobs/deactivateOldDevice');

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Smart Device Management API is running.' });
});

// JWT auth for socket connections
io.use((socket, next) => {
  try {
    require('./middlewares/auth').verifyTokenSocket(socket); // implement this method
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Connect Redis + Mongo, then start server
(async () => {
  try {
    await connectRedis();
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const port = process.env.PORT || 3000;
    server.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

module.exports = { app, io };
