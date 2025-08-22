const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { client: redisClient } = require('../config/redis');

router.get('/', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'up' : 'down';
    const redisStatus = await redisClient.ping() === 'PONG' ? 'up' : 'down';

    res.json({
      success: true,
      services: { mongo: mongoStatus, redis: redisStatus }
    });
  } catch (err) {
    res.status(500).json({ success: false, services: { mongo: 'unknown', redis: 'unknown' } });
  }
});

module.exports = router;
