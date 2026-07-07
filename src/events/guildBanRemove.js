const {
  AuditLogEvent,
  findRecentAuditEntry,
  formatAuditEntry,
  formatUser,
  sendModerationLog,
} = require('../utils/discordLogs');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban) {
    const entry = await findRecentAuditEntry(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);

    await sendModerationLog(ban.guild, {
      title: '🔓 Membre débanni',
      color: 0x57f287,
      thumbnail: ban.user.displayAvatarURL(),
      fields: [
        { name: 'Membre', value: formatUser(ban.user) },
        { name: 'Modération', value: formatAuditEntry(entry) },
      ],
      footer: `Utilisateur ${ban.user.id}`,
    });
  },
};
