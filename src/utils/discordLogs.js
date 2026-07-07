const { AuditLogEvent, EmbedBuilder } = require('discord.js');

const MODERATION_LOG_CHANNEL_ID = process.env.MODERATION_LOG_CHANNEL_ID || '1194475716759269376';
const INTERACTION_LOG_CHANNEL_ID = process.env.INTERACTION_LOG_CHANNEL_ID || '1197316258866135050';

function truncate(value, maximum = 1024) {
  const text = String(value ?? '').trim() || 'Aucun';
  return text.length > maximum ? `${text.slice(0, Math.max(0, maximum - 1))}…` : text;
}

function discordTimestamp(value, style = 'F') {
  const timestamp = Math.floor(new Date(value).getTime() / 1000);
  return Number.isFinite(timestamp) ? `<t:${timestamp}:${style}>` : 'Inconnue';
}

function formatUser(user) {
  if (!user) return 'Utilisateur inconnu';
  return `${user} • **${truncate(user.tag || user.username, 100)}** • \`${user.id}\``;
}

function formatAuditEntry(entry) {
  if (!entry) return 'Action personnelle ou auteur introuvable dans le journal d’audit.';
  const executor = entry.executor ? formatUser(entry.executor) : 'Auteur inconnu';
  return `${executor}${entry.reason ? `\nRaison : ${truncate(entry.reason, 800)}` : '\nRaison : non renseignée'}`;
}

async function findRecentAuditEntry(guild, type, targetId, maximumAge = 15_000) {
  if (!guild) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const auditLogs = await guild.fetchAuditLogs({ type, limit: 8 }).catch(() => null);
    const now = Date.now();
    const entry = auditLogs?.entries.find((candidate) => (
      (!targetId || candidate.target?.id === targetId)
      && now - candidate.createdTimestamp <= maximumAge
    ));

    if (entry) return entry;
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return null;
}

async function sendLog(guild, channelId, options) {
  if (!guild || !channelId) return null;
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return null;

  const embed = new EmbedBuilder()
    .setColor(options.color || 0x7c5cff)
    .setTitle(truncate(options.title || 'Journal Discord', 256))
    .setTimestamp();

  if (options.description) embed.setDescription(truncate(options.description, 4096));
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.footer) embed.setFooter({ text: truncate(options.footer, 2048) });

  const fields = (options.fields || [])
    .filter((field) => field?.name && field?.value !== undefined)
    .slice(0, 25)
    .map((field) => ({
      name: truncate(field.name, 256),
      value: truncate(field.value, 1024),
      inline: Boolean(field.inline),
    }));

  if (fields.length) embed.addFields(fields);

  return channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
  }).catch((error) => {
    console.error(`❌ Envoi du log impossible dans ${channelId} :`, error.message);
    return null;
  });
}

function sendModerationLog(guild, options) {
  return sendLog(guild, MODERATION_LOG_CHANNEL_ID, options);
}

function interactionKind(interaction) {
  if (interaction.isChatInputCommand?.()) return `Commande /${interaction.commandName}`;
  if (interaction.isButton?.()) return 'Bouton';
  if (interaction.isStringSelectMenu?.()) return 'Menu de sélection';
  if (interaction.isModalSubmit?.()) return 'Formulaire';
  if (interaction.isAutocomplete?.()) return 'Autocomplétion';
  return `Interaction type ${interaction.type}`;
}

function formatCommandOptions(options = [], prefix = '') {
  const lines = [];

  for (const option of options) {
    const path = prefix ? `${prefix} ${option.name}` : option.name;
    if (Array.isArray(option.options)) lines.push(...formatCommandOptions(option.options, path));
    else lines.push(`**${path}** : ${truncate(option.value, 300)}`);
  }

  return lines.join('\n') || 'Aucune option';
}

function getInteractionDetails(interaction) {
  if (interaction.isChatInputCommand?.()) {
    return formatCommandOptions(interaction.options?.data || []);
  }

  if (interaction.isStringSelectMenu?.()) {
    return `ID : \`${truncate(interaction.customId, 250)}\`\nValeurs : ${truncate(interaction.values?.join(', '), 650)}`;
  }

  if (interaction.isButton?.()) return `ID : \`${truncate(interaction.customId, 900)}\``;

  if (interaction.isModalSubmit?.()) {
    const fieldIds = interaction.fields?.fields?.map?.((field) => field.customId).filter(Boolean) || [];
    return `ID : \`${truncate(interaction.customId, 450)}\`\nChamps remplis : ${truncate(fieldIds.join(', '), 450)}`;
  }

  return 'Aucun détail supplémentaire';
}

async function sendInteractionLog(interaction, result = {}) {
  if (!interaction.guild) return null;

  const success = !result.error;
  return sendLog(interaction.guild, INTERACTION_LOG_CHANNEL_ID, {
    title: `${success ? '✅' : '❌'} ${interactionKind(interaction)}`,
    color: success ? 0x57f287 : 0xed4245,
    thumbnail: interaction.user?.displayAvatarURL?.(),
    fields: [
      { name: 'Utilisateur', value: formatUser(interaction.user) },
      { name: 'Serveur', value: `${truncate(interaction.guild.name, 100)} • \`${interaction.guildId}\``, inline: true },
      { name: 'Salon', value: interaction.channel ? `${interaction.channel} • \`${interaction.channelId}\`` : 'Inconnu', inline: true },
      { name: 'Détails', value: getInteractionDetails(interaction) },
      { name: 'Résultat', value: result.error ? truncate(result.error.stack || result.error.message, 1000) : `Traitée en **${result.durationMs || 0} ms**` },
    ],
    footer: `Interaction ${interaction.id}`,
  });
}

module.exports = {
  AuditLogEvent,
  MODERATION_LOG_CHANNEL_ID,
  INTERACTION_LOG_CHANNEL_ID,
  truncate,
  discordTimestamp,
  formatUser,
  formatAuditEntry,
  findRecentAuditEntry,
  sendModerationLog,
  sendInteractionLog,
};
