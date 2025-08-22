const mongoose = require('mongoose');


const deviceSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: { type: String, enum: ['active', 'inactive'] },
  last_active_at: {type: Date, index: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }
},
{
    timestamps: true
  }
);

deviceSchema.index({ owner_id: 1, type: 1, status: 1 });

module.exports = mongoose.model('Device', deviceSchema);
