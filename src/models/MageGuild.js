const mongoose = require('mongoose');

const mageGuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameKey: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: 'Aucune description.', trim: true, maxlength: 500 },
  ownerProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

mageGuildSchema.index({ guildId: 1, nameKey: 1 }, { unique: true });
mageGuildSchema.index({ guildId: 1, ownerProfileId: 1 }, { unique: true });

module.exports = mongoose.model('MageGuild', mageGuildSchema);
