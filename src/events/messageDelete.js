const {
  AuditLogEvent,
  findRecentAuditEntry,
  formatAuditEntry,
  formatUser,
  sendModerationLog,
  truncate,
} = require('../utils/discordLogs');

function attachmentList(message) {
  return message.attachments?.map((attachment) => `[${attachment.name || 'fichier'}](${attachment.url})`).join('\n') || 'Aucune';
}

module.exports = {
  name: 'messageDelete',
  async execute(message) {
    if (!message.guild) return;

    const entry = message.author
      ? await findRecentAuditEntry(message.guild, AuditLogEvent.MessageDelete, message.author.id)
      : null;

    await sendModerationLog(message.guild, {
      title: '🗑️ Message supprimé',
      color: 0xed4245,
      thumbnail: message.author?.displayAvatarURL?.(),
      fields: [
        { name: 'Auteur du message', value: formatUser(message.author) },
        { name: 'Salon', value: message.channel ? `${message.channel} • \`${message.channelId}\`` : `\`${message.channelId}\`` },
        { name: 'Contenu', value: truncate(message.content || 'Contenu indisponible (message absent du cache).', 1024) },
        { name: 'Pièces jointes', value: truncate(attachmentList(message), 1024) },
        { name: 'Données supplémentaires', value: `Embeds : **${message.embeds?.length || 0}** • Stickers : **${message.stickers?.size || 0}**`, inline: true },
        { name: 'Suppression', value: formatAuditEntry(entry) },
      ],
      footer: `Message ${message.id}`,
    });
  },
};
