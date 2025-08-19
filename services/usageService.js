const Log = require('../models/Log');


exports.calculateUsage = async (deviceId, rangeHours) => {
  const rangeDate = new Date(Date.now() - rangeHours * 60 * 60 * 1000);

  const logs = await Log.aggregate([
    {
      $match: {
        device_id: deviceId,
        event: 'units_consumed',
        timestamp: { $gte: rangeDate }
      }
    },
    {
      $group: {
        _id: '$device_id',
        total: { $sum: '$value' }
      }
    }
  ]);

  return logs.length > 0 ? logs[0].total : 0;
};
