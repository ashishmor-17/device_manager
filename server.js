require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// Rate Limiter

app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Routes

app.use('/auth', require('./routes/auth'));
app.use('/devices', require('./routes/device'));

// Background Job

require('./jobs/deactivateOldDevice');

app.get('/', (req, res) => {
  res.json({ success: true, message: 'Smart Device Management API is running.' });
});


// connecting to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

  module.exports = app;
// Export app for testing purposes