const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { setJSON } = require('../middlewares/cache');

const USER_TTL = 60 * 20; // 20 minutes

exports.signup = async (req, res) => {
  const { name, email, password, role } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(400).json({ success: false, message: 'User exists' });

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role });

  // store minimal user profile in cache for quick lookups (optional)
  await setJSON(`user:${user._id}`, USER_TTL, {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  });

  res.json({ success: true, message: 'User registered successfully' });
};

exports.login = async (req, res) => {
  const email = req.body.email.toLowerCase();
  const { password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

  // refresh cached user data
  await setJSON(`user:${user._id}`, USER_TTL, {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
  });

  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role }
  });
};
