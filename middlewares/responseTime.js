module.exports = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1e6;
    console.log(`[RT] ${req.method} ${req.originalUrl} -> ${ms.toFixed(2)} ms`);
  });
  next();
};
