const mongoose = require('mongoose');

const VALID_MAGE_RANKS = ['C', 'B', 'A', 'S', 'Sacré'];

const profileSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },

  characterName: { type: String, required: true, trim: true, maxlength: 80 },
  age: { type: String, default: 'Inconnu', trim: true, maxlength: 40 },
  gender: { type: String, default: 'Non précisé', trim: true, maxlength: 40 },
  guildName: { type: String, default: 'Sans guilde', trim: true, maxlength: 80 },
  magicType: { type: String, default: 'Magie inconnue', trim: true, maxlength: 120 },

  mageRank: { type: String, enum: VALID_MAGE_RANKS, default: 'C', index: true },
  powerLevel: { type: Number, default: 100, min: 0, max: 999999, index: true },

  title: { type: String, default: 'Mage errant', trim: true, maxlength: 80 },
  description: { type: String, default: 'Aucune description renseignée.', trim: true, maxlength: 1200 },

  avatarUrl: { type: String, default: null },
  bannerUrl: { type: String, default: null },

  level: { type: Number, default: 1, min: 1, index: true },
  xp: { type: Number, default: 0, min: 0 },
  jewels: { type: Number, default: 500, min: 0, index: true },
  reputation: { type: Number, default: 0, min: -100, max: 100, index: true },

  stats: {
    strength: { type: Number, default: 5, min: 0 },
    speed: { type: Number, default: 5, min: 0 },
    magic: { type: Number, default: 5, min: 0 },
    endurance: { type: Number, default: 5, min: 0 },
    intelligence: { type: Number, default: 5, min: 0 },
  },
}, {
  timestamps: true,
});

profileSchema.index({ userId: 1, guildId: 1, characterName: 1 });

profileSchema.statics.validMageRanks = VALID_MAGE_RANKS;

module.exports = mongoose.model('Profile', profileSchema);
