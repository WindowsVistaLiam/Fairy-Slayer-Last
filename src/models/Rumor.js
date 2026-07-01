const mongoose = require('mongoose');

const rumorSchema = new mongoose.Schema({
  targetProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },

  createdByProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    default: null,
    index: true,
  },

  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },

  type: {
    type: String,
    enum: ['positive', 'negative', 'neutral'],
    default: 'neutral',
    index: true,
  },

  credibility: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },

  impactShopPrice: {
    type: Number,
    default: 0,
    min: -0.5,
    max: 0.5,
  },

  expiresAt: {
    type: Date,
    default: null,
    index: true,
  },

  createdBy: {
    type: String,
    default: null,
    index: true,
  },

  deletedAt: {
    type: Date,
    default: null,
    index: true,
  },

  deletedBy: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

rumorSchema.index({
  targetProfileId: 1,
  type: 1,
  expiresAt: 1,
  deletedAt: 1,
});

module.exports = mongoose.model('Rumor', rumorSchema);