const mongoose = require('mongoose');

const profileMissionSchema = new mongoose.Schema({
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },

  missionId: {
    type: String,
    required: true,
    index: true,
  },

  status: {
    type: String,
    enum: ['active', 'pending_validation', 'completed', 'failed', 'cancelled'],
    default: 'active',
    index: true,
  },

  startedAt: {
    type: Date,
    default: Date.now,
  },

  submittedAt: {
    type: Date,
    default: null,
  },

  completedAt: {
    type: Date,
    default: null,
  },

  reviewedAt: {
    type: Date,
    default: null,
  },

  reviewedBy: {
    type: String,
    default: null,
  },

  staffNote: {
    type: String,
    default: '',
    trim: true,
    maxlength: 500,
  },
}, {
  timestamps: true,
});

profileMissionSchema.index({ profileId: 1, missionId: 1, status: 1 });

module.exports = mongoose.model('ProfileMission', profileMissionSchema);