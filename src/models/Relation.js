const mongoose = require('mongoose');

const relationSchema = new mongoose.Schema({
  ownerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },

  targetProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },

  type: {
    type: String,
    default: 'neutre',
    trim: true,
    maxlength: 40,
    index: true,
  },

  trust: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },

  tension: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  note: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },

  createdBy: {
    type: String,
    default: null,
    index: true,
  },

  updatedBy: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

relationSchema.index(
  {
    ownerProfileId: 1,
    targetProfileId: 1,
  },
  {
    unique: true,
  },
);

module.exports = mongoose.model('Relation', relationSchema);