const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  activeProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null },
  profileSlots: { type: Number, default: 3, min: 1, max: 20 },
}, {
  timestamps: true,
});

playerSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Player', playerSchema);
