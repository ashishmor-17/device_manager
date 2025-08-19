const mongoose = require('mongoose');


const logSchema = new mongoose.Schema({
  device_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' },
  event: String,
  value: Number,
  timestamp: { type: Date, default: Date.now }
},
{
    timestamps: true
  }
);

module.exports = mongoose.model('Log', logSchema);
