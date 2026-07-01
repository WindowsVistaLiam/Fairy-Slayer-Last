const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  rpChannelIds: { type: [String], default: [] },
  logChannelId: { type: String, default: null },
  staffRoleIds: { type: [String], default: [] },
  boosterRoleIds: { type: [String], default: [] },
  defaultProfileSlots: { type: Number, default: 3, min: 1, max: 20 },
  profileSlotRoleRules: {
    type: [{
      roleId: { type: String, required: true },
      slots: { type: Number, required: true, min: 1, max: 20 },
    }],
    default: [],
  },
  xpCooldownSeconds: { type: Number, default: 45, min: 5, max: 3600 },
  minMessageLength: { type: Number, default: 25, min: 1, max: 500 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
