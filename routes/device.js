const express = require('express');
const router = express.Router();
const { verifyToken: auth } = require('../middlewares/auth');
const { registerDevice, getDevices, heartbeat, createLog, getLogs, getUsage } = require('../controllers/deviceController');


router.post('/', auth, registerDevice);
router.get('/', auth, getDevices);
router.post('/:id/heartbeat', auth, heartbeat);
router.post('/:id/logs', auth, createLog);
router.get('/:id/logs', auth, getLogs);
router.get('/:id/usage', auth, getUsage);

module.exports = router;
