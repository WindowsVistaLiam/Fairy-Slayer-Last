const mongoose = require('mongoose');

const guildMemberSchema = new mongoose.Schema({
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
  rankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuildRank',
    default: null,
    index: true,
  },
  joinedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

guildMemberSchema.index({ guildId: 1, profileId: 1 }, { unique: true });
guildMemberSchema.index({ mageGuildId: 1, profileId: 1 }, { unique: true });

module.exports = mongoose.model('GuildMember', guildMemberSchema);
