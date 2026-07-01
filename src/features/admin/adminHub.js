const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const Profile = require('../../models/Profile');
const ReputationLog = require('../../models/ReputationLog');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { normalizeMageRank } = require('../../utils/ranks');
const { clampReputation } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');

function createCanvasEmbed(fileName) {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setImage(`attachment://${fileName}`);
}

function hasAdminPermission(interaction) {
  return interaction.memberPermissions?.has('ManageGuild') || interaction.memberPermissions?.has('Administrator');
}

function getAdminRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('admin:list_profiles').setLabel('Profils récents').setEmoji('👤').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('admin:edit_profile').setLabel('Modifier profil').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('admin:config_info').setLabel('Configuration').setEmoji('🧩').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function openAdminHub(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({ content: 'Tu n’as pas la permission d’utiliser le menu admin.', ephemeral: true });
  }

  const fileName = 'fairy-slayer-admin.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Menu admin',
    title: 'Gestion Fairy Slayer',
    subtitle: 'Menu réservé au staff du serveur.',
    lines: [
      'V1 disponible : voir les profils récents.',
      'V1 disponible : modifier rang de mage, puissance, Jewels et réputation.',
      'Prévu ensuite : inventaire, boutique complète, missions, rumeurs et relations.',
    ],
    footer: 'Utilise les boutons sous le Canvas pour naviguer dans le menu admin.',
  });

  return interaction.reply({ embeds: [createCanvasEmbed(fileName)], components: getAdminRows(), files: [attachment], ephemeral: true });
}

async function showRecentProfiles(interaction) {
  const profiles = await Profile.find({ guildId: interaction.guildId })
    .sort({ updatedAt: -1 })
    .limit(10);

  const lines = profiles.length
    ? profiles.map((profile) => `${profile.characterName} — joueur ${profile.userId} · Rang ${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Rep ${profile.reputation}`)
    : ['Aucun profil trouvé.'];

  const fileName = 'fairy-slayer-admin-profils.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Profils récents',
    title: `${profiles.length} profil(s) affiché(s)`,
    subtitle: 'Derniers profils créés ou modifiés sur ce serveur.',
    lines,
    footer: 'Menu /admin · Profils récents',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName)], components: getAdminRows(), files: [attachment] });
}

async function showEditProfileModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:edit_profile:modal')
    .setTitle('Modifier un profil');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('characterName')
        .setLabel('Nom exact du personnage')
        .setPlaceholder('Exemple : Kael Dragneel')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('mageRank')
        .setLabel('Nouveau rang de mage')
        .setPlaceholder('Laisser vide pour ne pas modifier. C, B, A, S ou Sacré')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('powerLevel')
        .setLabel('Nouveau niveau de puissance')
        .setPlaceholder('Laisser vide pour ne pas modifier. Exemple : 1450')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(8),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('jewelsDelta')
        .setLabel('Jewels à ajouter/retirer')
        .setPlaceholder('Exemple : 500 ou -200. Laisser vide pour 0')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reputationDelta')
        .setLabel('Réputation à ajouter/retirer')
        .setPlaceholder('Exemple : 5 ou -3. Laisser vide pour 0')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(8),
    ),
  );

  return interaction.showModal(modal);
}

async function handleEditProfileModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const mageRankInput = interaction.fields.getTextInputValue('mageRank')?.trim();
  const powerLevelInput = interaction.fields.getTextInputValue('powerLevel')?.trim();
  const jewelsDeltaInput = interaction.fields.getTextInputValue('jewelsDelta')?.trim();
  const reputationDeltaInput = interaction.fields.getTextInputValue('reputationDelta')?.trim();

  const profile = await Profile.findOne({
    guildId: interaction.guildId,
    characterName: { $regex: `^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  });

  if (!profile) {
    return interaction.reply({ content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`, ephemeral: true });
  }

  const changes = [];

  if (mageRankInput) {
    profile.mageRank = normalizeMageRank(mageRankInput);
    changes.push(`Rang : ${profile.mageRank}`);
  }

  if (powerLevelInput) {
    const power = Math.max(0, Math.min(999999, Number.parseInt(powerLevelInput, 10) || 0));
    profile.powerLevel = power;
    changes.push(`Puissance : ${formatNumber(power)}`);
  }

  const jewelsDelta = Number.parseInt(jewelsDeltaInput || '0', 10) || 0;
  if (jewelsDelta !== 0) {
    profile.jewels = Math.max(0, profile.jewels + jewelsDelta);
    changes.push(`Jewels : ${formatNumber(profile.jewels)} (${jewelsDelta > 0 ? '+' : ''}${formatNumber(jewelsDelta)})`);
  }

  const reputationDelta = Number.parseInt(reputationDeltaInput || '0', 10) || 0;
  if (reputationDelta !== 0) {
    profile.reputation = clampReputation(profile.reputation + reputationDelta);
    changes.push(`Réputation : ${profile.reputation} (${reputationDelta > 0 ? '+' : ''}${reputationDelta})`);

    await ReputationLog.create({
      profileId: profile._id,
      amount: reputationDelta,
      reason: 'Modification staff via /admin',
      source: 'admin',
      createdBy: interaction.user.id,
    });
  }

  await profile.save();

  const fileName = 'fairy-slayer-admin-modification.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Profil modifié',
    title: profile.characterName,
    subtitle: `Joueur Discord : ${profile.userId}`,
    lines: changes.length ? changes : ['Aucune modification appliquée.'],
    footer: 'Menu /admin · Modification staff enregistrée',
  });

  return interaction.reply({ embeds: [createCanvasEmbed(fileName)], files: [attachment], ephemeral: true });
}

async function showConfigInfo(interaction) {
  const fileName = 'fairy-slayer-admin-config.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Configuration',
    title: 'Paramètres serveur',
    subtitle: 'La configuration avancée arrivera dans la prochaine étape.',
    lines: [
      'Prévu : salons RP qui donnent de l’XP.',
      'Prévu : salon de logs.',
      'Prévu : rôles staff.',
      'Prévu : slots de profils selon les rôles.',
    ],
    footer: 'Menu /admin · Configuration',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName)], components: getAdminRows(), files: [attachment] });
}

async function handleAdminComponent(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({ content: 'Tu n’as pas la permission d’utiliser cette action.', ephemeral: true });
  }

  if (interaction.customId === 'admin:list_profiles') return showRecentProfiles(interaction);
  if (interaction.customId === 'admin:edit_profile') return showEditProfileModal(interaction);
  if (interaction.customId === 'admin:config_info') return showConfigInfo(interaction);

  return interaction.reply({ content: 'Action admin inconnue.', ephemeral: true });
}

async function handleAdminModal(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({ content: 'Tu n’as pas la permission d’utiliser cette action.', ephemeral: true });
  }

  if (interaction.customId === 'admin:edit_profile:modal') {
    return handleEditProfileModal(interaction);
  }

  return interaction.reply({ content: 'Formulaire admin inconnu.', ephemeral: true });
}

module.exports = {
  openAdminHub,
  handleAdminComponent,
  handleAdminModal,
};
