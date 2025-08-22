const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth');
const exportController = require('../controllers/exportController');


router.get('/logs/:deviceId', verifyToken, exportController.exportDeviceLogs);
router.get('/usage/:deviceId', verifyToken, exportController.exportUsageReport);
router.get('/jobs/:jobId', verifyToken, exportController.checkExportJob);

module.exports = router;
