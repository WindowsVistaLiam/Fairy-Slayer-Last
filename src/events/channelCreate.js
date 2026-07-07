const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'channelCreate',
  async execute(channel) {
    if (!channel.guild) return;
    const entry = await findRecentAuditEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    await sendModerationLog(channel.guild, {
      title: '➕ Salon créé',
      color: 0x57f287,
      fields: [
        { name: 'Salon', value: `${channel} • **${channel.name}** • \`${channel.id}\`` },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'Catégorie', value: channel.parent ? `${channel.parent} • \`${channel.parentId}\`` : 'Aucune', inline: true },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Salon ${channel.id}`,
    });
  },
};
