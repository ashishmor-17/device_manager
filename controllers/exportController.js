const Device = require('../models/Device');
const Log = require('../models/Log');
const { Parser } = require('json2csv'); // npm install json2csv
const { v4: uuidv4 } = require('uuid');

// Simulated in-memory job store
const jobs = {};

// Export logs as CSV/JSON
exports.exportDeviceLogs = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { format = 'json', start, end, async = 'false' } = req.query;

    // Verify device ownership
    const device = await Device.findOne({ _id: deviceId, owner_id: req.user.id });
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    const query = { device_id: deviceId };
    if (start || end) query.timestamp = {};
    if (start) query.timestamp.$gte = new Date(start);
    if (end) query.timestamp.$lte = new Date(end);

    if (async === 'true') {
      const jobId = uuidv4();
      jobs[jobId] = { status: 'processing' };
      console.log(`[Export Job] Started ${jobId} for device ${deviceId}`);

      // Simulate async processing
      setTimeout(async () => {
        const logs = await Log.find(query);
        jobs[jobId] = { status: 'done', data: logs };
        console.log(`[Export Job] Completed ${jobId}, email notification sent!`);
      }, 2000);

      return res.json({ success: true, jobId, message: 'Export started' });
    }

    const logs = await Log.find(query);

    if (format === 'csv') {
      const parser = new Parser({ fields: ['device_id','event','value','timestamp'] });
      const csv = parser.parse(logs);
      res.header('Content-Type', 'text/csv');
      return res.attachment(`device_${deviceId}_logs.csv`).send(csv);
    }

    res.json({ success: true, logs });

  } catch (error) {
    console.error('[Export Logs Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Usage report as JSON (chart-friendly)
exports.exportUsageReport = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { range = '24h' } = req.query;

    const device = await Device.findOne({ _id: deviceId, owner_id: req.user.id });
    if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

    const now = new Date();
    let startTime;
    switch (range) {
      case '24h': startTime = new Date(now.getTime() - 24*60*60*1000); break;
      case '7d': startTime = new Date(now.getTime() - 7*24*60*60*1000); break;
      case '30d': startTime = new Date(now.getTime() - 30*24*60*60*1000); break;
      default: return res.status(400).json({ success: false, message: 'Invalid range' });
    }

    const usage = await Log.aggregate([
      { $match: { device_id: device._id, event: 'units_consumed', timestamp: { $gte: startTime, $lte: now } } },
      { $group: { _id: null, total: { $sum: '$value' } } }
    ]);

    const report = {
      deviceId,
      range,
      total_units_consumed: usage[0]?.total || 0,
      chartData: [
        { timestamp: startTime, value: usage[0]?.total || 0 }, 
        { timestamp: now, value: usage[0]?.total || 0 }
      ]
    };

    res.json({ success: true, report });

  } catch (error) {
    console.error('[Usage Report Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check async job status
exports.checkExportJob = (req, res) => {
  const { jobId } = req.params;
  if (!jobs[jobId]) return res.status(404).json({ success: false, message: 'Job not found' });
  res.json({ success: true, job: jobs[jobId] });
};
