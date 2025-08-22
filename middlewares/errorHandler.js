module.exports = (err, req, res, next) => {
  console.error(err);
  const code = err.status || 500;
  res.status(code).json({
    success: false,
    errorCode: code,
    message: err.message || 'Internal Server Error'
  });
};
