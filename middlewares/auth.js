const jwt = require('jsonwebtoken');
const { client: redisClient } = require('../config/redis');

// verify access token
exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const blacklisted = await redisClient.get(`bl_${token}`);
    if (blacklisted) return res.status(401).json({ message: 'Token revoked' });

    const user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = user;
    next();
  } catch {
    return res.status(403).json({ message: 'Forbidden' });
  }
};

// generate tokens
exports.generateTokens = (user) => {
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
  return { accessToken, refreshToken };
};

// refresh token route
exports.refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    const blacklisted = await redisClient.get(`bl_${token}`);
    if (blacklisted) return res.status(401).json({ message: 'Token revoked' });

    // blacklist old refresh token
    await redisClient.set(`bl_${token}`, 'revoked', { EX: 7 * 24 * 3600 });

    // generate new tokens (rotation)
    const tokens = exports.generateTokens({ id: payload.id, role: payload.role, email: payload.email });
    res.json(tokens);
  } catch {
    res.status(403).json({ message: 'Invalid refresh token' });
  }
};

exports.verifyTokenSocket = (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) throw new Error('No token provided');

  const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  socket.user = payload;
};
