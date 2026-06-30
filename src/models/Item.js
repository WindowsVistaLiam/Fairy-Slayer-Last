const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: 'Aucune description.' },
  type: { type: String, enum: ['consommable', 'equipement', 'lacrima', 'rare', 'mission'], default: 'consommable', index: true },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary', 'sacred'], default: 'common', index: true },
  basePrice: { type: Number, default: 100, min: 0 },
  sellPrice: { type: Number, default: 25, min: 0 },
  imageUrl: { type: String, default: null },
  requiredMageRank: { type: String, enum: ['C', 'B', 'A', 'S', 'Sacré'], default: 'C' },
  requiredPowerLevel: { type: Number, default: 0, min: 0 },
  availableInShop: { type: Boolean, default: true },
  effects: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Item', itemSchema);
