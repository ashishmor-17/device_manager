const express = require('express');
const router = express.Router();
const { refreshToken } = require('../middlewares/auth');
const { signup, login } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh', refreshToken);

module.exports = router;
