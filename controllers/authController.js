const User = require('../models/User');
const bcrypt = require('bcrypt');
const { generateTokens } = require('../middlewares/auth');
const { setJSON } = require('../middlewares/cache');

const USER_TTL = 60 * 20;

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'User exists' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed, role });

    // cache user profile
    await setJSON(`user:${user._id}`, USER_TTL, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.json({ success: true, message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const email = req.body.email.toLowerCase();
    const { password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // generate access + refresh tokens
    const tokens = generateTokens({
      id: user._id,
      role: user.role,
      email: user.email
    });

    // refresh cached user data
    await setJSON(`user:${user._id}`, USER_TTL, {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      ...tokens // returns access token & refresh token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
