const { formatUser, sendModerationLog } = require('../utils/discordLogs');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    const member = newState.member || oldState.member;
    if (!member) return;

    const fields = [{ name: 'Membre', value: formatUser(member.user) }];
    let title = null;
    let color = 0x5865f2;

    if (!oldState.channelId && newState.channelId) {
      title = '🎤 Connexion vocale';
      color = 0x57f287;
      fields.push({ name: 'Salon rejoint', value: `${newState.channel} • \`${newState.channelId}\`` });
    } else if (oldState.channelId && !newState.channelId) {
      title = '📴 Déconnexion vocale';
      color = 0xfaa61a;
      fields.push({ name: 'Salon quitté', value: `${oldState.channel} • \`${oldState.channelId}\`` });
    } else if (oldState.channelId !== newState.channelId) {
      title = '🔀 Déplacement vocal';
      fields.push(
        { name: 'Avant', value: `${oldState.channel} • \`${oldState.channelId}\``, inline: true },
        { name: 'Après', value: `${newState.channel} • \`${newState.channelId}\``, inline: true },
      );
    } else if (oldState.serverMute !== newState.serverMute) {
      title = newState.serverMute ? '🔇 Mute vocal serveur' : '🔊 Unmute vocal serveur';
      color = newState.serverMute ? 0xed4245 : 0x57f287;
      fields.push({ name: 'Salon', value: `${newState.channel}` });
    } else if (oldState.serverDeaf !== newState.serverDeaf) {
      title = newState.serverDeaf ? '🙉 Sourdine serveur activée' : '👂 Sourdine serveur retirée';
      color = newState.serverDeaf ? 0xed4245 : 0x57f287;
      fields.push({ name: 'Salon', value: `${newState.channel}` });
    }

    if (!title) return;
    await sendModerationLog(newState.guild, {
      title,
      color,
      thumbnail: member.user.displayAvatarURL(),
      fields,
      footer: `Membre ${member.id}`,
    });
  },
};
