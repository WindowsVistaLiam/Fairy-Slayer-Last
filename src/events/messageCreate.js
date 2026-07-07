const GuildConfig = require('../models/GuildConfig');
const { getActiveProfile } = require('../utils/activeProfile');
const { calculateMessageXp, applyXp } = require('../utils/xp');
const { createLevelUpCanvas } = require('../canvas/levelUpCanvas');
const { sendGuildLog } = require('../utils/guildConfig');
const { applyFarmerXpBonus } = require('../utils/professions');
const ReputationLog = require('../models/ReputationLog');

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
        { returnDocument: 'after', upsert: true },
      );

      if (!config.rpChannelIds.length || !config.rpChannelIds.includes(message.channel.id)) return;

      const key = getCooldownKey(message.guild.id, message.author.id);
      const now = Date.now();
      const lastGain = xpCooldowns.get(key) || 0;
      const cooldownMs = config.xpCooldownSeconds * 1000;

      if (now - lastGain < cooldownMs) return;

      const baseXp = calculateMessageXp(message.content, config.minMessageLength);
      if (baseXp <= 0) return;

      const profile = await getActiveProfile(message.author.id, message.guild.id);
      if (!profile) return;

      xpCooldowns.set(key, now);
      const gainedXp = applyFarmerXpBonus(baseXp, profile.profession);
      const { leveledUp } = applyXp(profile, gainedXp);

      let bardReputationGained = false;
      if (profile.profession === 'barde' && message.content.trim().length >= 120) {
        profile.professionProgress.bardLongMessages = Number(profile.professionProgress.bardLongMessages || 0) + 1;
        if (profile.professionProgress.bardLongMessages >= 10) {
          profile.professionProgress.bardLongMessages = 0;
          if (Number(profile.reputation || 0) < 100) {
            profile.reputation = Math.min(100, Number(profile.reputation || 0) + 1);
            bardReputationGained = true;
          }
        }
      }
      await profile.save();

      if (bardReputationGained) {
        await ReputationLog.create({
          profileId: profile._id,
          amount: 1,
          reason: 'Dix récits longs partagés en salon RP.',
          source: 'profession_barde',
          createdBy: message.author.id,
        });
      }

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
