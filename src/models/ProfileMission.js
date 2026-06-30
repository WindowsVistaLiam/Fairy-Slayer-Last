const mongoose = require('mongoose');

const profileMissionSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Profile', required: true, index: true },
  missionId: { type: String, required: true, index: true },
  status: { type: String, enum: ['active', 'completed', 'failed'], default: 'active', index: true },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

profileMissionSchema.index({ profileId: 1, missionId: 1, status: 1 });

module.exports = mongoose.model('ProfileMission', profileMissionSchema);
