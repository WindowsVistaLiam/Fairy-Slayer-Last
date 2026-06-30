const mongoose = require('mongoose');

const relationSchema = new mongoose.Schema({
  ownerProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  targetProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  type: { type: String, default: 'Relation inconnue', trim: true, maxlength: 80 },
  description: { type: String, default: 'Aucune description.', trim: true, maxlength: 1000 },
  trust: { type: Number, default: 50, min: 0, max: 100 },
  tension: { type: Number, default: 0, min: 0, max: 100 },
}, {
  timestamps: true,
});

relationSchema.index({ ownerProfileId: 1, targetProfileId: 1 }, { unique: true });

module.exports = mongoose.model('Relation', relationSchema);
