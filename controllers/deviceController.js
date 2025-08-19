const mongoose = require('mongoose');
const Device = require('../models/Device');
const Log = require('../models/Log');

exports.registerDevice = async (req, res) => {
  try {
    const { name, type, status } = req.body;
    const device = await Device.create({
      name,
      type,
      status,
      owner_id: req.user.id
    });

    res.json({
      success: true,
      device
    });
  } catch (error) {
    console.error('[RegisterDevice Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getDevices = async (req, res) => {
  try {
    const { type, status } = req.query;
    const query = { owner_id: req.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const devices = await Device.find(query);
    res.json({ success: true, devices });
  } catch (error) {
    console.error('[GetDevices Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.heartbeat = async (req, res) => {
  const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid device ID' });
    }
    const { status } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: id, owner_id: req.user.id },
      { status, last_active_at: new Date() },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.json({
      success: true,
      message: 'Device heartbeat recorded',
      last_active_at: device.last_active_at
    });
  } catch (error) {
    console.error('[Heartbeat Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.createLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { event, value } = req.body;

    if (!event || typeof value !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    // verify device ownership
    const device = await Device.findOne({ _id: id, owner_id: req.user.id });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found or unauthorized' });
    }

    const log = await Log.create({
      device_id: id,
      event,
      value
    });

    res.status(201).json({ success: true, log });
  } catch (error) {
    console.error('[CreateLog Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // verify device ownership
    const device = await Device.findOne({ _id: id, owner_id: req.user.id });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found or unauthorized' });
    }

    const logs = await Log.find({ device_id: id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, logs });
  } catch (error) {
    console.error('[GetLogs Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


exports.getUsage = async (req, res) => {
  try {
    const { id } = req.params;
    const { range = '24h' } = req.query;

    // Parse time range
    const now = new Date();
    let startTime;

    switch (range) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid range. Use 24h, 7d, or 30d.' });
    }

    // Ensure the device belongs to the user
    const device = await Device.findOne({ _id: id, owner_id: req.user.id });
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found or unauthorized' });
    }

    // Aggregate logs
    const usage = await Log.aggregate([
      {
        $match: {
          device_id: new mongoose.Types.ObjectId(id),
          event: 'units_consumed',
          timestamp: { $gte: startTime, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$value' }
        }
      }
    ]);

    res.json({
      success: true,
      range,
      total_units_consumed: usage[0]?.total || 0
    });
  } catch (error) {
    console.error('[GetUsage Error]', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
