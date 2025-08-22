module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 100) console.warn(`[SlowQuery] ${req.method} ${req.originalUrl} - ${duration}ms`);
  });
  next();
};
