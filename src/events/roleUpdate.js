const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'roleUpdate',
  async execute(oldRole, newRole) {
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Nom** : ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Couleur** : ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`**Affiché séparément** : ${oldRole.hoist ? 'Oui' : 'Non'} → ${newRole.hoist ? 'Oui' : 'Non'}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionnable** : ${oldRole.mentionable ? 'Oui' : 'Non'} → ${newRole.mentionable ? 'Oui' : 'Non'}`);
    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permissions** : modifiées');
    if (oldRole.position !== newRole.position) changes.push(`**Position** : ${oldRole.position} → ${newRole.position}`);
    if (!changes.length) return;

    const entry = await findRecentAuditEntry(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    await sendModerationLog(newRole.guild, {
      title: '🛠️ Rôle modifié',
      color: newRole.color || 0xfee75c,
      fields: [
        { name: 'Rôle', value: `${newRole} • \`${newRole.id}\`` },
        { name: 'Changements', value: changes.join('\n') },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Rôle ${newRole.id}`,
    });
  },
};
