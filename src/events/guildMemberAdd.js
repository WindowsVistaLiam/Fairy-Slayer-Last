const { discordTimestamp, formatUser, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member) {
    const accountAge = Date.now() - member.user.createdTimestamp;
    const recentAccount = accountAge < 7 * 24 * 60 * 60 * 1000;

    await sendModerationLog(member.guild, {
      title: '🟢 Membre arrivé',
      color: recentAccount ? 0xfee75c : 0x57f287,
      thumbnail: member.user.displayAvatarURL(),
      fields: [
        { name: 'Membre', value: formatUser(member.user) },
        { name: 'Compte créé', value: `${discordTimestamp(member.user.createdAt)} (${discordTimestamp(member.user.createdAt, 'R')})` },
        { name: 'Compte récent', value: recentAccount ? '⚠️ Oui, moins de 7 jours' : 'Non', inline: true },
        { name: 'Nombre de membres', value: String(member.guild.memberCount), inline: true },
      ],
      footer: `Membre ${member.id}`,
    });
  },
};
