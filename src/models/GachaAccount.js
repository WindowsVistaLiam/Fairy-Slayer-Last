const mongoose = require('mongoose');

const gachaAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  fragments: { type: Number, default: 0, min: 0 },
  totalPulls: { type: Number, default: 0, min: 0 },
  pityEpic: { type: Number, default: 0, min: 0 },
  pityLegendary: { type: Number, default: 0, min: 0 },
  pityMythic: { type: Number, default: 0, min: 0 },
  freeDrawAvailableAt: { type: Date, default: null },
}, {
  timestamps: true,
});

gachaAccountSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('GachaAccount', gachaAccountSchema);
