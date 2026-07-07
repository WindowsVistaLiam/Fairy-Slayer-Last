const {
  AuditLogEvent,
  discordTimestamp,
  findRecentAuditEntry,
  formatAuditEntry,
  formatUser,
  sendModerationLog,
} = require('../utils/discordLogs');

function roleList(roles) {
  return roles.map((role) => `${role} (\`${role.id}\`)`).join(', ') || 'Aucun';
}

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    const fields = [{ name: 'Membre', value: formatUser(newMember.user) }];
    let title = '👤 Membre modifié';
    let color = 0x5865f2;
    let auditType = AuditLogEvent.MemberUpdate;

    const oldTimeout = oldMember.communicationDisabledUntilTimestamp || 0;
    const newTimeout = newMember.communicationDisabledUntilTimestamp || 0;

    if (oldTimeout !== newTimeout) {
      if (newTimeout > Date.now()) {
        title = '🔇 Membre rendu muet';
        color = 0xed4245;
        fields.push({ name: 'Fin du mute', value: `${discordTimestamp(newTimeout)} (${discordTimestamp(newTimeout, 'R')})` });
      } else {
        title = '🔊 Mute retiré';
        color = 0x57f287;
        fields.push({ name: 'Ancienne expiration', value: oldTimeout ? discordTimestamp(oldTimeout) : 'Inconnue' });
      }
    }

    if (oldMember.nickname !== newMember.nickname) {
      fields.push({ name: 'Surnom', value: `Avant : **${oldMember.nickname || 'Aucun'}**\nAprès : **${newMember.nickname || 'Aucun'}**` });
    }

    const addedRoles = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));

    if (addedRoles.size || removedRoles.size) {
      auditType = AuditLogEvent.MemberRoleUpdate;
      if (title === '👤 Membre modifié') title = '🎭 Rôles d’un membre modifiés';
      if (addedRoles.size) fields.push({ name: 'Rôles ajoutés', value: roleList([...addedRoles.values()]) });
      if (removedRoles.size) fields.push({ name: 'Rôles retirés', value: roleList([...removedRoles.values()]) });
    }

    if (fields.length === 1) return;

    const entry = await findRecentAuditEntry(newMember.guild, auditType, newMember.id);
    fields.push({ name: 'Auteur / raison', value: formatAuditEntry(entry) });

    await sendModerationLog(newMember.guild, {
      title,
      color,
      thumbnail: newMember.user.displayAvatarURL(),
      fields,
      footer: `Membre ${newMember.id}`,
    });
  },
};
