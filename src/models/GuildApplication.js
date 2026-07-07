const mongoose = require('mongoose');

const guildApplicationSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  mageGuildId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MageGuild',
    required: true,
    index: true,
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },
  message: { type: String, default: '', trim: true, maxlength: 500 },
}, {
  timestamps: true,
});

guildApplicationSchema.index({ mageGuildId: 1, profileId: 1 }, { unique: true });

module.exports = mongoose.model('GuildApplication', guildApplicationSchema);
