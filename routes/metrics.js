const express = require('express');
const router = express.Router();

let requestCount = 0;
let totalResponseTime = 0;

router.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    requestCount++;
    totalResponseTime += (Date.now() - start);
  });
  next();
});

router.get('/', (req, res) => {
  res.json({
    success: true,
    metrics: {
      requestCount,
      avgResponseTime: requestCount ? totalResponseTime / requestCount : 0
    }
  });
});

module.exports = router;
