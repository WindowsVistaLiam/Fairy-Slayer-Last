const { sendModerationLog, truncate } = require('../utils/discordLogs');

module.exports = {
  name: 'messageDeleteBulk',
  async execute(messages, channel) {
    const guild = channel.guild;
    if (!guild) return;

    const sample = [...messages.values()].slice(0, 10).map((message) => (
      `• ${message.author?.tag || 'Auteur inconnu'} : ${truncate(message.content || '[contenu indisponible]', 150)}`
    )).join('\n');

    await sendModerationLog(guild, {
      title: '🧹 Suppression massive de messages',
      color: 0x992d22,
      fields: [
        { name: 'Salon', value: `${channel} • \`${channel.id}\`` },
        { name: 'Nombre', value: String(messages.size), inline: true },
        { name: 'Aperçu (10 maximum)', value: sample || 'Contenu indisponible' },
      ],
      footer: `Salon ${channel.id}`,
    });
  },
};
