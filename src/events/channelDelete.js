const { AuditLogEvent, findRecentAuditEntry, formatAuditEntry, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'channelDelete',
  async execute(channel) {
    if (!channel.guild) return;
    const entry = await findRecentAuditEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    await sendModerationLog(channel.guild, {
      title: '➖ Salon supprimé',
      color: 0xed4245,
      fields: [
        { name: 'Salon', value: `**${channel.name}** • \`${channel.id}\`` },
        { name: 'Type', value: String(channel.type), inline: true },
        { name: 'Ancienne catégorie', value: channel.parent?.name || 'Aucune', inline: true },
        { name: 'Auteur / raison', value: formatAuditEntry(entry) },
      ],
      footer: `Salon ${channel.id}`,
    });
  },
};
