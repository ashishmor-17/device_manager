require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectRedis } = require('./config/redis');


const app = express();

app.use(require('./middlewares/logger'));
app.use(express.json());


// Response time logging (to spot slow endpoints)
app.use(require('./middlewares/responseTime'));

// CORS setup
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE'] }));

// Rate Limiter (global)
const authLimiter = rateLimit({ windowMs: 60*1000, max: 10 }); // auth: 10 requests/min
const deviceLimiter = rateLimit({ windowMs: 60*1000, max: 50 }); // devices: 50 requests/min

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

// Connect Redis + Mongo, then start server
(async () => {
  try {
    await connectRedis();
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
})();

module.exports = app; // for testing
