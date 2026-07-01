const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const Profile = require('../../models/Profile');
const Rumor = require('../../models/Rumor');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getActiveProfile } = require('../../utils/activeProfile');
const { formatNumber, truncateText } = require('../../utils/format');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');

function hasStaffPermission(interaction) {
  return interaction.memberPermissions?.has('ManageGuild')
    || interaction.memberPermissions?.has('Administrator');
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getProfileNameRegex(characterName) {
  return {
    $regex: `^${escapeRegex(characterName)}$`,
    $options: 'i',
  };
}

async function findProfileByName(guildId, characterName) {
  return Profile.findOne({
    guildId,
    characterName: getProfileNameRegex(characterName),
  });
}

function normalizeRumorType(value) {
  const normalized = String(value || 'neutral')
    .trim()
    .toLowerCase();

  if (['positive', 'positif', '+', 'bonne'].includes(normalized)) return 'positive';
  if (['negative', 'négative', 'negative', 'negatif', 'négatif', '-', 'mauvaise'].includes(normalized)) return 'negative';

  return 'neutral';
}

function getRumorTypeLabel(type) {
  const labels = {
    positive: 'Positive',
    negative: 'Négative',
    neutral: 'Neutre',
  };

  return labels[type] || 'Neutre';
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);

  if (Number.isNaN(parsed)) return fallback;

  return Math.max(min, Math.min(max, parsed));
}

function parseImpactShopPrice(value) {
  const raw = String(value || '').trim().replace(',', '.');

  if (!raw) return 0;

  let parsed = Number.parseFloat(raw);

  if (Number.isNaN(parsed)) return 0;

  if (Math.abs(parsed) > 1) {
    parsed /= 100;
  }

  return Math.max(-0.5, Math.min(0.5, parsed));
}

function getRumorImpactText(rumor) {
  const impact = Number(rumor?.impactShopPrice || 0);

  if (impact === 0) return 'Aucun impact boutique';

  const percent = Math.round(Math.abs(impact) * 100);

  if (rumor.type === 'positive') {
    return `Réduction boutique possible : ${percent}%`;
  }

  if (rumor.type === 'negative') {
    return `Malus boutique possible : ${percent}%`;
  }

  return `Impact boutique : ${impact > 0 ? '+' : ''}${percent}%`;
}

function getExpirationText(rumor) {
  if (!rumor.expiresAt) return 'Permanente';

  const expiresAt = new Date(rumor.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) return 'Inconnue';

  if (expiresAt <= new Date()) return 'Expirée';

  return expiresAt.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function respondCanvas(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    await interaction.deferUpdate();
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

function getRumorQuery(profileId, includeExpired = false) {
  const query = {
    targetProfileId: profileId,
    deletedAt: null,
  };

  if (!includeExpired) {
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } },
    ];
  }

  return query;
}

async function getRumorRows(profile, interaction, rumors) {
  const rows = [];

  if (rumors.length) {
    const options = rumors.slice(0, 25).map((rumor) => (
      new StringSelectMenuOptionBuilder()
        .setLabel(truncateText(rumor.content, 100))
        .setDescription(
          `${getRumorTypeLabel(rumor.type)} · crédibilité ${rumor.credibility}% · ${getRumorImpactText(rumor)}`.slice(0, 100),
        )
        .setValue(String(rumor._id))
    ));

    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rumor:select')
          .setPlaceholder('Voir le détail d’une rumeur')
          .addOptions(options),
      ),
    );
  }

  const buttons = [
    new ButtonBuilder()
      .setCustomId('rumor:refresh')
      .setLabel('Actualiser')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('profile:home')
      .setLabel('Retour profil')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  ];

  if (hasStaffPermission(interaction)) {
    buttons.unshift(
      new ButtonBuilder()
        .setCustomId('rumor:add')
        .setLabel('Ajouter rumeur')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),
    );
  }

  rows.push(new ActionRowBuilder().addComponents(buttons));

  return rows;
}

async function showRumors(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rumors = await Rumor.find(getRumorQuery(profile._id))
    .sort({ createdAt: -1 })
    .limit(10);

  const positiveCount = rumors.filter((rumor) => rumor.type === 'positive').length;
  const negativeCount = rumors.filter((rumor) => rumor.type === 'negative').length;

  const lines = rumors.length
    ? rumors.map((rumor) => (
      `${getRumorTypeLabel(rumor.type)} — ${truncateText(rumor.content, 80)} · crédibilité ${rumor.credibility}% · ${getRumorImpactText(rumor)}`
    ))
    : ['Aucune rumeur active sur ce personnage.'];

  const fileName = 'fairy-slayer-rumeurs.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'rumors',
    section: `Rumeurs — ${profile.characterName}`,
    title: `${rumors.length} rumeur(s) active(s)`,
    subtitle: 'Les rumeurs peuvent influencer la réputation RP et certains prix boutique.',
    stats: [
      { label: 'Actives', value: formatNumber(rumors.length) },
      { label: 'Positives', value: formatNumber(positiveCount) },
      { label: 'Négatives', value: formatNumber(negativeCount) },
      { label: 'Neutres', value: formatNumber(rumors.length - positiveCount - negativeCount) },
    ],
    lines,
    footer: 'Menu /profil - Rumeurs',
  });

  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: await getRumorRows(profile, interaction, rumors),
  }));
}

async function showRumorDetail(interaction, rumorId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rumor = await Rumor.findOne({
    _id: rumorId,
    targetProfileId: profile._id,
    deletedAt: null,
  });

  if (!rumor) {
    return interaction.reply({
      content: 'Rumeur introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rows = [];

  const buttons = [
    new ButtonBuilder()
      .setCustomId('rumor:refresh')
      .setLabel('Retour rumeurs')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  ];

  if (hasStaffPermission(interaction)) {
    buttons.unshift(
      new ButtonBuilder()
        .setCustomId(`rumor:delete:${rumor._id}`)
        .setLabel('Supprimer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),
    );
  }

  rows.push(new ActionRowBuilder().addComponents(buttons));

  const fileName = 'fairy-slayer-rumeur-detail.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'rumors',
    section: `Rumeur — ${profile.characterName}`,
    title: getRumorTypeLabel(rumor.type),
    subtitle: truncateText(rumor.content, 120),
    stats: [
      { label: 'Type', value: getRumorTypeLabel(rumor.type) },
      { label: 'Crédibilité', value: `${formatNumber(rumor.credibility)}%` },
      { label: 'Impact', value: `${Math.round(Math.abs(Number(rumor.impactShopPrice || 0)) * 100)}%` },
      { label: 'Expire', value: getExpirationText(rumor) },
    ],
    lines: [
      `Rumeur : ${rumor.content}`,
      `Type : ${getRumorTypeLabel(rumor.type)}`,
      `Crédibilité : ${rumor.credibility}%`,
      `Impact boutique : ${getRumorImpactText(rumor)}`,
      `Expiration : ${getExpirationText(rumor)}`,
    ],
    footer: 'Menu /profil - Détail rumeur',
  });

  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: rows,
  }));
}

async function showAddRumorModal(interaction) {
  if (!hasStaffPermission(interaction)) {
    return interaction.reply({
      content: 'Seul le staff peut ajouter une rumeur.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const modal = new ModalBuilder()
    .setCustomId('rumor:add:modal')
    .setTitle('Ajouter une rumeur');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('targetName')
        .setLabel('Nom exact du personnage ciblé')
        .setPlaceholder('Exemple : Natsu Dragneel')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('type')
        .setLabel('Type')
        .setPlaceholder('positive, negative ou neutral')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('content')
        .setLabel('Contenu de la rumeur')
        .setPlaceholder('Exemple : On dit qu’il aurait sauvé une guilde entière.')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(500),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('credibility')
        .setLabel('Crédibilité sur 100')
        .setPlaceholder('Exemple : 70')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(3),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('impact')
        .setLabel('Impact boutique')
        .setPlaceholder('Exemple : 0.10 ou 10 pour 10%. 0 = aucun')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(8),
    ),
  );

  return interaction.showModal(modal);
}

async function handleAddRumorModal(interaction) {
  if (!hasStaffPermission(interaction)) {
    return interaction.reply({
      content: 'Seul le staff peut ajouter une rumeur.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetName = interaction.fields.getTextInputValue('targetName').trim();
  const type = normalizeRumorType(interaction.fields.getTextInputValue('type'));
  const content = interaction.fields.getTextInputValue('content').trim();
  const credibility = clampNumber(interaction.fields.getTextInputValue('credibility'), 0, 100, 50);
  const impactShopPrice = parseImpactShopPrice(interaction.fields.getTextInputValue('impact'));

  const targetProfile = await findProfileByName(interaction.guildId, targetName);

  if (!targetProfile) {
    return interaction.reply({
      content: `Aucun personnage trouvé avec le nom exact **${truncateText(targetName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await Rumor.create({
    targetProfileId: targetProfile._id,
    content,
    type,
    credibility,
    impactShopPrice,
    expiresAt: null,
    createdBy: interaction.user.id,
  });

  return interaction.reply({
    content: `✅ Rumeur ajoutée sur **${targetProfile.characterName}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function deleteRumor(interaction, rumorId) {
  if (!hasStaffPermission(interaction)) {
    return interaction.reply({
      content: 'Seul le staff peut supprimer une rumeur.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rumor = await Rumor.findOne({
    _id: rumorId,
    deletedAt: null,
  });

  if (!rumor) {
    return interaction.reply({
      content: 'Rumeur introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  rumor.deletedAt = new Date();
  rumor.deletedBy = interaction.user.id;

  await rumor.save();

  return interaction.reply({
    content: '✅ Rumeur supprimée.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRumorComponent(interaction) {
  const id = interaction.customId;

  if (id === 'rumor:refresh') return showRumors(interaction);
  if (id === 'rumor:add') return showAddRumorModal(interaction);

  if (id === 'rumor:select') {
    return showRumorDetail(interaction, interaction.values[0]);
  }

  if (id.startsWith('rumor:delete:')) {
    return deleteRumor(interaction, id.replace('rumor:delete:', ''));
  }

  return interaction.reply({
    content: 'Interaction rumeur inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRumorModal(interaction) {
  const id = interaction.customId;

  if (id === 'rumor:add:modal') return handleAddRumorModal(interaction);

  return interaction.reply({
    content: 'Formulaire rumeur inconnu.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  showRumors,
  handleRumorComponent,
  handleRumorModal,
};