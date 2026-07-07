const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'roleDelete',
  async execute(role) {
    const entry = await findRecentAuditEntry(role.guild, AuditLogEvent.RoleDelete, role.id);
    await sendModerationLog(role.guild, {
      title: '🗑️ Rôle supprimé',
      color: 0xed4245,
      fields: [
        { name: 'Rôle', value: `**${role.name}** • \`${role.id}\`` },
        { name: 'Ancienne position', value: String(role.position), inline: true },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Rôle ${role.id}`,
    });
  },
};
