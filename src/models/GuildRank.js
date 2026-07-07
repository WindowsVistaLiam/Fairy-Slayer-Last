const mongoose = require('mongoose');

const guildRankSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  mageGuildId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MageGuild',
    required: true,
    index: true,
  },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  nameKey: { type: String, required: true, trim: true, maxlength: 50 },
  priority: { type: Number, default: 0, min: 0, max: 100 },
  canManageMembers: { type: Boolean, default: false },
  canManageRanks: { type: Boolean, default: false },
}, {
  timestamps: true,
});

guildRankSchema.index({ mageGuildId: 1, nameKey: 1 }, { unique: true });

module.exports = mongoose.model('GuildRank', guildRankSchema);
