const mongoose = require('mongoose');

const reputationLogSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: 'Aucune raison indiquée.', trim: true, maxlength: 500 },
  source: { type: String, default: 'admin', trim: true },
  createdBy: { type: String, required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ReputationLog', reputationLogSchema);
