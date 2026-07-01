const mongoose = require('mongoose');

const gachaCardSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  cardId: { type: String, required: true, index: true },
  copiesSeen: { type: Number, default: 1, min: 1 },
  source: { type: String, default: 'gacha' },
  favorite: { type: Boolean, default: false },
  obtainedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

gachaCardSchema.index({ userId: 1, guildId: 1, cardId: 1 }, { unique: true });

module.exports = mongoose.model('GachaCard', gachaCardSchema);
