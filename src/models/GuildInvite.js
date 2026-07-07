const mongoose = require('mongoose');

const guildInviteSchema = new mongoose.Schema({
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
  invitedByProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
  },
}, {
  timestamps: true,
});

guildInviteSchema.index({ mageGuildId: 1, profileId: 1 }, { unique: true });
guildInviteSchema.index({ guildId: 1, profileId: 1 });

module.exports = mongoose.model('GuildInvite', guildInviteSchema);
