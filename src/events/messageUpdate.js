const { formatUser, sendModerationLog, truncate } = require('../utils/discordLogs');

function attachmentIds(message) {
  return [...(message.attachments?.keys?.() || [])].sort().join(',');
}

function attachmentList(message) {
  return message.attachments?.map((attachment) => `[${attachment.name || 'fichier'}](${attachment.url})`).join('\n') || 'Aucune';
}

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage) {
    if (!newMessage.guild) return;

    const contentChanged = oldMessage.content !== newMessage.content;
    const attachmentsChanged = attachmentIds(oldMessage) !== attachmentIds(newMessage);
    if (!contentChanged && !attachmentsChanged) return;

    await sendModerationLog(newMessage.guild, {
      title: '✏️ Message modifié',
      color: 0xfee75c,
      thumbnail: newMessage.author?.displayAvatarURL?.(),
      fields: [
        { name: 'Auteur', value: formatUser(newMessage.author) },
        { name: 'Salon', value: `${newMessage.channel} • \`${newMessage.channelId}\`` },
        { name: 'Avant', value: truncate(oldMessage.content || 'Contenu indisponible ou vide.', 1024) },
        { name: 'Après', value: truncate(newMessage.content || 'Contenu vide.', 1024) },
        ...(attachmentsChanged ? [
          { name: 'Fichiers avant', value: truncate(attachmentList(oldMessage), 1024) },
          { name: 'Fichiers après', value: truncate(attachmentList(newMessage), 1024) },
        ] : []),
        { name: 'Accès direct', value: `[Ouvrir le message](${newMessage.url})` },
      ],
      footer: `Message ${newMessage.id}`,
    });
  },
};
