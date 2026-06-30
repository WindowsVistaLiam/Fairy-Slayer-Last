const mongoose = require('mongoose');

const rumorSchema = new mongoose.Schema({
  targetProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  authorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', default: null, index: true },
  content: { type: String, required: true, trim: true, maxlength: 700 },
  type: { type: String, enum: ['positive', 'negative', 'neutral'], default: 'neutral', index: true },
  credibility: { type: Number, default: 50, min: 0, max: 100 },
  intensity: { type: Number, default: 1, min: 1, max: 10 },
  impactReputation: { type: Number, default: 0 },
  impactShopPrice: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null, index: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Rumor', rumorSchema);
