const {
  AuditLogEvent,
  discordTimestamp,
  findRecentAuditEntry,
  formatAuditEntry,
  formatUser,
  sendModerationLog,
} = require('../utils/discordLogs');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member) {
    const kickEntry = await findRecentAuditEntry(member.guild, AuditLogEvent.MemberKick, member.id);
    const roles = member.roles?.cache
      ?.filter((role) => role.id !== member.guild.id)
      .map((role) => role.toString())
      .join(', ') || 'Aucun rôle';

    await sendModerationLog(member.guild, {
      title: kickEntry ? '🥾 Membre expulsé' : '🔴 Membre parti',
      color: kickEntry ? 0xed4245 : 0xfaa61a,
      thumbnail: member.user.displayAvatarURL(),
      fields: [
        { name: 'Membre', value: formatUser(member.user) },
        { name: kickEntry ? 'Modération' : 'Départ', value: kickEntry ? formatAuditEntry(kickEntry) : 'Départ volontaire ou expulsion non visible dans le journal d’audit.' },
        { name: 'Avait rejoint', value: member.joinedAt ? `${discordTimestamp(member.joinedAt)} (${discordTimestamp(member.joinedAt, 'R')})` : 'Date inconnue' },
        { name: 'Rôles au départ', value: roles },
        { name: 'Nombre de membres', value: String(member.guild.memberCount), inline: true },
      ],
      footer: `Membre ${member.id}`,
    });
  },
};
