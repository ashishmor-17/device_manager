const cron = require('node-cron');
const Device = require('../models/Device');

cron.schedule('0 * * * *', async () => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await Device.updateMany(
      { last_active_at: { $lt: cutoff }, status: 'active' },
      { status: 'inactive' }
    );
    console.log(`[Job] Deactivated ${result.modifiedCount} stale devices at ${new Date().toISOString()}`);
  } catch (error) {
    console.error('[Job Error] Failed to deactivate stale devices:', error);
  }
});
