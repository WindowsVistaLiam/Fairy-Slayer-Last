const mongoose = require('mongoose');

const dailyStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  lastType: { type: String, default: null },
  availableAt: { type: Date, default: null },
}, { timestamps: true });

dailyStateSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('DailyState', dailyStateSchema);
