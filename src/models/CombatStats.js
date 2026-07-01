const mongoose = require('mongoose');

const combatStatsSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  pveWins: { type: Number, default: 0, min: 0 },
  pveLosses: { type: Number, default: 0, min: 0 },
  pvpWins: { type: Number, default: 0, min: 0 },
  pvpLosses: { type: Number, default: 0, min: 0 },
  fragmentsWon: { type: Number, default: 0, min: 0 },
  fragmentsLost: { type: Number, default: 0, min: 0 },
  lastPveAt: { type: Date, default: null },
  lastPvpAt: { type: Date, default: null },
}, { timestamps: true });

combatStatsSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('CombatStats', combatStatsSchema);
