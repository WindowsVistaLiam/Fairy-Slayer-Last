const {
  AuditLogEvent,
  findRecentAuditEntry,
  formatAuditEntry,
  formatUser,
  sendModerationLog,
} = require('../utils/discordLogs');

module.exports = {
  name: 'guildBanAdd',
  async execute(ban) {
    const entry = await findRecentAuditEntry(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

    await sendModerationLog(ban.guild, {
      title: '🔨 Membre banni',
      color: 0x992d22,
      thumbnail: ban.user.displayAvatarURL(),
      fields: [
        { name: 'Membre', value: formatUser(ban.user) },
        { name: 'Modération', value: formatAuditEntry(entry) },
        { name: 'Raison du ban', value: ban.reason || entry?.reason || 'Non renseignée' },
      ],
      footer: `Utilisateur ${ban.user.id}`,
    });
  },
};
