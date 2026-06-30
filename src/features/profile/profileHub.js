const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const Player = require('../../models/Player');
const Profile = require('../../models/Profile');
const Inventory = require('../../models/Inventory');
const ProfileMission = require('../../models/ProfileMission');
const Relation = require('../../models/Relation');
const Rumor = require('../../models/Rumor');
const ReputationLog = require('../../models/ReputationLog');
const { createProfileCanvas } = require('../../canvas/profileCanvas');
const { getOrCreatePlayer, getActiveProfile, setActiveProfile, countProfiles } = require('../../utils/activeProfile');
const { normalizeMageRank } = require('../../utils/ranks');
const { getReputationLabel } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');

function getMainRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile:home').setLabel('Profil').setEmoji('👤').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('profile:inventory').setLabel('Inventaire').setEmoji('🎒').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile:missions').setLabel('Missions').setEmoji('📜').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile:relations').setLabel('Relations').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile:rumors').setLabel('Rumeurs').setEmoji('🗣️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile:reputation').setLabel('Réputation').setEmoji('⭐').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('profile:switch').setLabel('Changer').setEmoji('🔁').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('profile:edit').setLabel('Modifier').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function getNoProfileRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile:create').setLabel('Créer mon premier personnage').setEmoji('✨').setStyle(ButtonStyle.Success),
    ),
  ];
}

async function replyOrUpdate(interaction, payload) {
  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    const { ephemeral, ...updatePayload } = payload;
    return interaction.update(updatePayload);
  }

  if (interaction.replied || interaction.deferred) {
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

async function openProfileHub(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    const embed = new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle('Fairy Slayer — Aucun personnage actif')
      .setDescription('Tu n’as pas encore de personnage. Crée ton premier profil RP pour commencer à gagner de l’XP, des Jewels et utiliser les menus du bot.');

    return replyOrUpdate(interaction, {
      embeds: [embed],
      components: getNoProfileRows(),
      files: [],
      ephemeral: true,
    });
  }

  const attachment = await createProfileCanvas(profile, interaction.user);

  const embed = new EmbedBuilder()
    .setColor(0x7c5cff)
    .setTitle(`Fairy Slayer — ${profile.characterName}`)
    .setDescription([
      `**Mage de rang :** ${profile.mageRank}`,
      `**Niveau de puissance :** ${formatNumber(profile.powerLevel)}`,
      `**Réputation :** ${profile.reputation} — ${getReputationLabel(profile.reputation)}`,
      '',
      'Utilise les boutons pour gérer ce personnage.',
    ].join('\n'))
    .setImage('attachment://fairy-slayer-profil.png');

  return replyOrUpdate(interaction, {
    embeds: [embed],
    components: getMainRows(),
    files: [attachment],
    ephemeral: false,
  });
}

async function showCreateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('profile:create:modal')
    .setTitle('Créer un personnage');

  const nameInput = new TextInputBuilder()
    .setCustomId('characterName')
    .setLabel('Nom du personnage')
    .setPlaceholder('Exemple : Kael Dragneel')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(80);

  const ageInput = new TextInputBuilder()
    .setCustomId('age')
    .setLabel('Âge')
    .setPlaceholder('Exemple : 22 ans')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(40);

  const magicInput = new TextInputBuilder()
    .setCustomId('magicType')
    .setLabel('Magie')
    .setPlaceholder('Exemple : Magie du feu stellaire')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(120);

  const rankInput = new TextInputBuilder()
    .setCustomId('mageRank')
    .setLabel('Mage de rang')
    .setPlaceholder('C, B, A, S ou Sacré')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(10);

  const powerInput = new TextInputBuilder()
    .setCustomId('powerLevel')
    .setLabel('Niveau de puissance')
    .setPlaceholder('Exemple : 1450')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(8);

  modal.addComponents(
    new ActionRowBuilder().addComponents(nameInput),
    new ActionRowBuilder().addComponents(ageInput),
    new ActionRowBuilder().addComponents(magicInput),
    new ActionRowBuilder().addComponents(rankInput),
    new ActionRowBuilder().addComponents(powerInput),
  );

  return interaction.showModal(modal);
}

async function handleCreateModal(interaction) {
  const player = await getOrCreatePlayer(interaction.user.id, interaction.guildId);
  const profileCount = await countProfiles(interaction.user.id, interaction.guildId);

  if (profileCount >= player.profileSlots) {
    return interaction.reply({
      content: `Tu as déjà atteint ta limite de **${player.profileSlots} profil(s)**. Demande au staff d’augmenter tes slots si besoin.`,
      ephemeral: true,
    });
  }

  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const age = interaction.fields.getTextInputValue('age')?.trim() || 'Inconnu';
  const magicType = interaction.fields.getTextInputValue('magicType').trim();
  const mageRank = normalizeMageRank(interaction.fields.getTextInputValue('mageRank'));
  const rawPower = interaction.fields.getTextInputValue('powerLevel')?.trim();
  const powerLevel = Math.max(0, Math.min(999999, Number.parseInt(rawPower || '100', 10) || 100));

  const profile = await Profile.create({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    characterName,
    age,
    magicType,
    mageRank,
    powerLevel,
  });

  await Inventory.create({ profileId: profile._id, items: [] });
  await setActiveProfile(interaction.user.id, interaction.guildId, profile._id);

  return openProfileHub(interaction);
}

async function showSwitchMenu(interaction) {
  const profiles = await Profile.find({
    userId: interaction.user.id,
    guildId: interaction.guildId,
  }).sort({ createdAt: 1 }).limit(25);

  if (!profiles.length) {
    return openProfileHub(interaction);
  }

  const options = profiles.map((profile) => new StringSelectMenuOptionBuilder()
    .setLabel(truncateText(profile.characterName, 90))
    .setDescription(`${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Niveau ${profile.level}`.slice(0, 100))
    .setValue(String(profile._id)));

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile:switch:select')
    .setPlaceholder('Choisis ton personnage actif')
    .addOptions(options);

  const rows = [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile:create').setLabel('Créer un autre perso').setEmoji('✨').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('profile:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
    ),
  ];

  const embed = new EmbedBuilder()
    .setColor(0x7c5cff)
    .setTitle('Fairy Slayer — Changer de personnage')
    .setDescription('Sélectionne le personnage qui recevra l’XP, les Jewels, les missions et les actions RP.');

  return interaction.update({ embeds: [embed], components: rows, files: [] });
}

async function handleSwitchSelect(interaction) {
  const profileId = interaction.values[0];
  const profile = await Profile.findOne({ _id: profileId, userId: interaction.user.id, guildId: interaction.guildId });

  if (!profile) {
    return interaction.reply({ content: 'Ce profil est introuvable.', ephemeral: true });
  }

  await setActiveProfile(interaction.user.id, interaction.guildId, profile._id);
  return openProfileHub(interaction);
}

async function showEditModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const modal = new ModalBuilder()
    .setCustomId('profile:edit:modal')
    .setTitle('Modifier le personnage actif');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('characterName')
        .setLabel('Nom du personnage')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80)
        .setValue(profile.characterName),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('guildName')
        .setLabel('Guilde')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(80)
        .setValue(profile.guildName || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('magicType')
        .setLabel('Magie')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120)
        .setValue(profile.magicType),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('avatarUrl')
        .setLabel('Lien image du personnage')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(500)
        .setValue(profile.avatarUrl || ''),
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('description')
        .setLabel('Courte description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1200)
        .setValue(profile.description || ''),
    ),
  );

  return interaction.showModal(modal);
}

async function handleEditModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  profile.characterName = interaction.fields.getTextInputValue('characterName').trim();
  profile.guildName = interaction.fields.getTextInputValue('guildName')?.trim() || 'Sans guilde';
  profile.magicType = interaction.fields.getTextInputValue('magicType').trim();
  profile.avatarUrl = interaction.fields.getTextInputValue('avatarUrl')?.trim() || null;
  profile.description = interaction.fields.getTextInputValue('description')?.trim() || 'Aucune description renseignée.';

  await profile.save();
  return openProfileHub(interaction);
}

async function showInventory(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const inventory = await Inventory.findOne({ profileId: profile._id });
  const itemCount = inventory?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  const embed = new EmbedBuilder()
    .setColor(0x2b8cff)
    .setTitle(`🎒 Inventaire — ${profile.characterName}`)
    .setDescription([
      `**Objets possédés :** ${formatNumber(itemCount)}`,
      '',
      'La V1 prépare la base de l’inventaire. La V2 ajoutera les objets détaillés, les catégories, l’achat/vente et la grille Canvas complète.',
    ].join('\n'));

  return interaction.update({ embeds: [embed], components: getMainRows(), files: [] });
}

async function showMissions(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const active = await ProfileMission.countDocuments({ profileId: profile._id, status: 'active' });
  const completed = await ProfileMission.countDocuments({ profileId: profile._id, status: 'completed' });
  const failed = await ProfileMission.countDocuments({ profileId: profile._id, status: 'failed' });

  const embed = new EmbedBuilder()
    .setColor(0xffb347)
    .setTitle(`📜 Missions — ${profile.characterName}`)
    .setDescription([
      `**Actives :** ${active}`,
      `**Terminées :** ${completed}`,
      `**Échouées :** ${failed}`,
      '',
      'La V2/V3 ajoutera les missions disponibles, acceptées, validées par le staff et les récompenses.',
    ].join('\n'));

  return interaction.update({ embeds: [embed], components: getMainRows(), files: [] });
}

async function showRelations(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const relations = await Relation.find({ ownerProfileId: profile._id }).limit(8).populate('targetProfileId');
  const lines = relations.length
    ? relations.map((relation) => `• **${relation.targetProfileId?.characterName || 'Personnage inconnu'}** — ${relation.type} · confiance ${relation.trust}% · tension ${relation.tension}%`)
    : ['Aucune relation renseignée pour l’instant.'];

  const embed = new EmbedBuilder()
    .setColor(0x64d2a6)
    .setTitle(`🤝 Relations — ${profile.characterName}`)
    .setDescription(lines.join('\n'));

  return interaction.update({ embeds: [embed], components: getMainRows(), files: [] });
}

async function showRumors(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const now = new Date();
  const rumors = await Rumor.find({
    targetProfileId: profile._id,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  }).sort({ createdAt: -1 }).limit(8);

  const lines = rumors.length
    ? rumors.map((rumor) => `• **${rumor.type}** · crédibilité ${rumor.credibility}% — ${truncateText(rumor.content, 110)}`)
    : ['Aucune rumeur active pour l’instant.'];

  const embed = new EmbedBuilder()
    .setColor(0xc084fc)
    .setTitle(`🗣️ Rumeurs — ${profile.characterName}`)
    .setDescription(lines.join('\n'));

  return interaction.update({ embeds: [embed], components: getMainRows(), files: [] });
}

async function showReputation(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const logs = await ReputationLog.find({ profileId: profile._id }).sort({ createdAt: -1 }).limit(5);
  const lines = logs.length
    ? logs.map((log) => `• ${log.amount > 0 ? '+' : ''}${log.amount} — ${truncateText(log.reason, 90)}`)
    : ['Aucun historique de réputation.'];

  const embed = new EmbedBuilder()
    .setColor(0xffdf91)
    .setTitle(`⭐ Réputation — ${profile.characterName}`)
    .setDescription([
      `**Score :** ${profile.reputation}`,
      `**Statut :** ${getReputationLabel(profile.reputation)}`,
      '',
      '**Derniers changements :**',
      ...lines,
    ].join('\n'));

  return interaction.update({ embeds: [embed], components: getMainRows(), files: [] });
}

module.exports = {
  openProfileHub,
  showCreateModal,
  handleCreateModal,
  showSwitchMenu,
  handleSwitchSelect,
  showEditModal,
  handleEditModal,
  showInventory,
  showMissions,
  showRelations,
  showRumors,
  showReputation,
};
