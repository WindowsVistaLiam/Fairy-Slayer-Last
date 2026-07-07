const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel) {
    const changes = [];
    if (oldChannel.name !== newChannel.name) changes.push(`**Nom** : ${oldChannel.name} → ${newChannel.name}`);
    if (oldChannel.parentId !== newChannel.parentId) changes.push(`**Catégorie** : ${oldChannel.parent?.name || 'Aucune'} → ${newChannel.parent?.name || 'Aucune'}`);
    if (oldChannel.topic !== newChannel.topic) changes.push(`**Sujet** : ${oldChannel.topic || 'Aucun'} → ${newChannel.topic || 'Aucun'}`);
    if (oldChannel.nsfw !== newChannel.nsfw) changes.push(`**NSFW** : ${oldChannel.nsfw ? 'Oui' : 'Non'} → ${newChannel.nsfw ? 'Oui' : 'Non'}`);
    if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`**Mode lent** : ${oldChannel.rateLimitPerUser || 0}s → ${newChannel.rateLimitPerUser || 0}s`);
    if (oldChannel.bitrate !== newChannel.bitrate) changes.push(`**Débit** : ${oldChannel.bitrate || 0} → ${newChannel.bitrate || 0}`);
    if (oldChannel.userLimit !== newChannel.userLimit) changes.push(`**Limite vocale** : ${oldChannel.userLimit || 0} → ${newChannel.userLimit || 0}`);
    if (!changes.length) return;

    const entry = await findRecentAuditEntry(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
    await sendModerationLog(newChannel.guild, {
      title: '🛠️ Salon modifié',
      color: 0xfee75c,
      fields: [
        { name: 'Salon', value: `${newChannel} • \`${newChannel.id}\`` },
        { name: 'Changements', value: changes.join('\n') },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Salon ${newChannel.id}`,
    });
  },
};
