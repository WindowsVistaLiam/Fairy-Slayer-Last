const GuildConfig = require('../models/GuildConfig');
const { getActiveProfile } = require('../utils/activeProfile');
const { calculateMessageXp, applyXp } = require('../utils/xp');
const { createLevelUpCanvas } = require('../canvas/levelUpCanvas');
const { sendGuildLog } = require('../utils/guildConfig');

const xpCooldowns = new Map();

function getCooldownKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    try {
      if (!message.guild || message.author.bot) return;

      const config = await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { $setOnInsert: { guildId: message.guild.id } },
        { new: true, upsert: true },
      );

      if (!config.rpChannelIds.length || !config.rpChannelIds.includes(message.channel.id)) return;

      const key = getCooldownKey(message.guild.id, message.author.id);
      const now = Date.now();
      const lastGain = xpCooldowns.get(key) || 0;
      const cooldownMs = config.xpCooldownSeconds * 1000;

      if (now - lastGain < cooldownMs) return;

      const gainedXp = calculateMessageXp(message.content, config.minMessageLength);
      if (gainedXp <= 0) return;

      const profile = await getActiveProfile(message.author.id, message.guild.id);
      if (!profile) return;

      xpCooldowns.set(key, now);
      const { leveledUp } = applyXp(profile, gainedXp);
      await profile.save();

      if (leveledUp) {
        const attachment = await createLevelUpCanvas(profile, gainedXp);
        await message.channel.send({
          content: `✨ **${profile.characterName}** gagne en puissance !`,
          files: [attachment],
        });
        await sendGuildLog(message.guild, 'Niveau RP gagné', [
          `<@${message.author.id}> — **${profile.characterName}**`,
          `Niveau atteint : **${profile.level}**`,
          `XP du message : **${gainedXp}** dans <#${message.channel.id}>`,
        ], 0xf7d078);
      }
    } catch (error) {
      console.error('❌ Erreur messageCreate XP :', error);
    }
  },
};
