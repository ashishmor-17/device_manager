const mongoose = require('mongoose');


const deviceSchema = new mongoose.Schema({
  name: String,
  type: String,
  status: { type: String, enum: ['active', 'inactive'] },
  last_active_at: Date,
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
},
{
    timestamps: true
  }
);

module.exports = mongoose.model('Device', deviceSchema);
