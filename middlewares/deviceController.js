const Device = require('../models/Device');


exports.registerDevice = async (req, res) => {
  try {
    const { name, type, status } = req.body;
    const device = await Device.create({ name, type, status, owner_id: req.user.id });
    res.json({ success: true, device });
  } catch (error) {
    console.error('[RegisterDevice Error]', error);
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
    console.error('[GetDevices Error]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const device = await Device.findOneAndUpdate(
      { _id: id, owner_id: req.user.id },
      { last_active_at: new Date(), status },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.json({ success: true, message: 'Device heartbeat recorded', last_active_at: device.last_active_at });
  } catch (error) {
    console.error('[Heartbeat Error]', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
