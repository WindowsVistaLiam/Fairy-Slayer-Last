const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'roleCreate',
  async execute(role) {
    const entry = await findRecentAuditEntry(role.guild, AuditLogEvent.RoleCreate, role.id);
    await sendModerationLog(role.guild, {
      title: '🎭 Rôle créé',
      color: role.color || 0x57f287,
      fields: [
        { name: 'Rôle', value: `${role} • **${role.name}** • \`${role.id}\`` },
        { name: 'Position', value: String(role.position), inline: true },
        { name: 'Mentionnable', value: role.mentionable ? 'Oui' : 'Non', inline: true },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Rôle ${role.id}`,
    });
  },
};
