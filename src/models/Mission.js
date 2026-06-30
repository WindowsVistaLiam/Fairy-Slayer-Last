const mongoose = require('mongoose');

const missionSchema = new mongoose.Schema({
  missionId: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: 'Aucune description.' },
  rank: { type: String, enum: ['C', 'B', 'A', 'S', 'Sacré'], default: 'C', index: true },
  requiredPowerLevel: { type: Number, default: 0, min: 0 },
  rewards: {
    xp: { type: Number, default: 0, min: 0 },
    jewels: { type: Number, default: 0, min: 0 },
    reputation: { type: Number, default: 0 },
    items: { type: [String], default: [] },
  },
  isAvailable: { type: Boolean, default: true, index: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Mission', missionSchema);
