const mongoose = require('mongoose');

const combatSessionSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  challengerId: { type: String, required: true, index: true },
  opponentId: { type: String, required: true, index: true },
  challengerCardId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolving', 'completed', 'refused', 'expired'], default: 'pending', index: true },
  winnerId: { type: String, default: null },
  fragmentsTransferred: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

combatSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('CombatSession', combatSessionSchema);
