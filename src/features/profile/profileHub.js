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

const Profile = require('../../models/Profile');
const Inventory = require('../../models/Inventory');
const ProfileMission = require('../../models/ProfileMission');
const Relation = require('../../models/Relation');
const Rumor = require('../../models/Rumor');
const ReputationLog = require('../../models/ReputationLog');
const { createProfileCanvas } = require('../../canvas/profileCanvas');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getOrCreatePlayer, getActiveProfile, setActiveProfile, countProfiles } = require('../../utils/activeProfile');
const { normalizeMageRank } = require('../../utils/ranks');
const { getReputationLabel } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');

function createCanvasEmbed(fileName, color = 0x7c5cff) {
  return new EmbedBuilder()
    .setColor(color)
    .setImage(`attachment://${fileName}`);
}

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
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('profile:image').setLabel('Modifier l’image').setEmoji('🖼️').setStyle(ButtonStyle.Secondary),
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

function isValidHttpUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch (_) {
    return false;
  }
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

  const fileName = 'fairy-slayer-profil.png';
  const attachment = await createProfileCanvas(profile, interaction.user);

  return replyOrUpdate(interaction, {
    embeds: [createCanvasEmbed(fileName)],
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

  const fileName = 'fairy-slayer-profils.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'profile',
    section: 'Changer de personnage',
    title: `${profiles.length} profil(s) disponible(s)`,
    subtitle: 'Le profil actif reçoit l’XP, les Jewels, les missions et les actions RP.',
    lines: profiles.map((profile, index) => `${index + 1}. ${profile.characterName} — Rang ${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Niveau ${profile.level}`),
    footer: 'Utilise le menu déroulant sous le Canvas pour choisir ton personnage actif.',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: rows,
    files: [attachment],
  });
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
        .setCustomId('title')
        .setLabel('Titre RP')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(80)
        .setValue(profile.title || ''),
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
  profile.title = interaction.fields.getTextInputValue('title')?.trim() || 'Mage errant';
  profile.description = interaction.fields.getTextInputValue('description')?.trim() || 'Aucune description renseignée.';

  await profile.save();
  return openProfileHub(interaction);
}

async function showImageModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const modal = new ModalBuilder()
    .setCustomId('profile:image:modal')
    .setTitle('Modifier l’image du personnage');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('avatarUrl')
        .setLabel('Lien image du personnage')
        .setPlaceholder('https://...png, jpg, jpeg, webp ou gif')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(500)
        .setValue(profile.avatarUrl || ''),
    ),
  );

  return interaction.showModal(modal);
}

async function handleImageModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const avatarUrl = interaction.fields.getTextInputValue('avatarUrl')?.trim() || null;

  if (!isValidHttpUrl(avatarUrl)) {
    return interaction.reply({
      content: 'Le lien image doit commencer par `http://` ou `https://`. Laisse le champ vide pour revenir à ton avatar Discord.',
      ephemeral: true,
    });
  }

  profile.avatarUrl = avatarUrl;
  await profile.save();

  return openProfileHub(interaction);
}

async function showInventory(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const inventory = await Inventory.findOne({ profileId: profile._id });
  const itemCount = inventory?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  const fileName = 'fairy-slayer-inventaire.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Inventaire — ${profile.characterName}`,
    title: `${formatNumber(itemCount)} objet(s) possédé(s)`,
    subtitle: 'La grille détaillée d’objets arrivera dans la V2.',
    stats: [
      { label: 'Jewels', value: formatNumber(profile.jewels) },
      { label: 'Rang', value: profile.mageRank },
      { label: 'Puissance', value: formatNumber(profile.powerLevel) },
      { label: 'Objets', value: formatNumber(itemCount) },
    ],
    lines: [
      'Base inventaire active : chaque personnage possède son inventaire séparé.',
      'La prochaine étape ajoutera les catégories : consommables, équipements, lacrimas, rares et objets de mission.',
      'Les achats de la boutique seront liés directement au profil actif.',
    ],
    footer: 'Menu /profil · Inventaire du personnage actif',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName, 0x2b8cff)], components: getMainRows(), files: [attachment] });
}

async function showMissions(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const active = await ProfileMission.countDocuments({ profileId: profile._id, status: 'active' });
  const completed = await ProfileMission.countDocuments({ profileId: profile._id, status: 'completed' });
  const failed = await ProfileMission.countDocuments({ profileId: profile._id, status: 'failed' });

  const fileName = 'fairy-slayer-missions.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: `Missions — ${profile.characterName}`,
    title: 'Tableau de missions',
    subtitle: 'Suivi des missions du personnage actif.',
    stats: [
      { label: 'Actives', value: formatNumber(active) },
      { label: 'Terminées', value: formatNumber(completed) },
      { label: 'Échouées', value: formatNumber(failed) },
      { label: 'Rang mage', value: profile.mageRank },
    ],
    lines: [
      'La V2/V3 ajoutera les missions disponibles, acceptées, validées par le staff et les récompenses.',
      'Les prérequis pourront utiliser le rang de mage et le niveau de puissance.',
      'Les récompenses pourront donner XP, Jewels, réputation et objets.',
    ],
    footer: 'Menu /profil · Missions du personnage actif',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName, 0xffb347)], components: getMainRows(), files: [attachment] });
}

async function showRelations(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const relations = await Relation.find({ ownerProfileId: profile._id }).limit(8).populate('targetProfileId');
  const lines = relations.length
    ? relations.map((relation) => `${relation.targetProfileId?.characterName || 'Personnage inconnu'} — ${relation.type} · confiance ${relation.trust}% · tension ${relation.tension}%`)
    : ['Aucune relation renseignée pour l’instant.'];

  const fileName = 'fairy-slayer-relations.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'relations',
    section: `Relations — ${profile.characterName}`,
    title: `${relations.length} relation(s) affichée(s)`,
    subtitle: 'Liens sociaux, alliances, rivalités et tensions RP.',
    lines,
    footer: 'Menu /profil · Relations du personnage actif',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName, 0x64d2a6)], components: getMainRows(), files: [attachment] });
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
    ? rumors.map((rumor) => `${rumor.type} · crédibilité ${rumor.credibility}% — ${truncateText(rumor.content, 110)}`)
    : ['Aucune rumeur active pour l’instant.'];

  const fileName = 'fairy-slayer-rumeurs.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'rumors',
    section: `Rumeurs — ${profile.characterName}`,
    title: `${rumors.length} rumeur(s) active(s)`,
    subtitle: 'Les rumeurs pourront influencer les prix, la réputation et les relations.',
    lines,
    footer: 'Menu /profil · Rumeurs actives du personnage actif',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName, 0xc084fc)], components: getMainRows(), files: [attachment] });
}

async function showReputation(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const logs = await ReputationLog.find({ profileId: profile._id }).sort({ createdAt: -1 }).limit(5);
  const lines = logs.length
    ? logs.map((log) => `${log.amount > 0 ? '+' : ''}${log.amount} — ${truncateText(log.reason, 90)}`)
    : ['Aucun historique de réputation.'];

  const fileName = 'fairy-slayer-reputation.png';
  const attachment = await createPanelCanvas({
    fileName,
    variant: 'reputation',
    section: `Réputation — ${profile.characterName}`,
    title: getReputationLabel(profile.reputation),
    subtitle: 'La réputation influence les prix et la perception RP du personnage.',
    stats: [
      { label: 'Score', value: String(profile.reputation) },
      { label: 'Statut', value: getReputationLabel(profile.reputation) },
      { label: 'Rang', value: profile.mageRank },
      { label: 'Puissance', value: formatNumber(profile.powerLevel) },
    ],
    lines: ['Derniers changements :', ...lines],
    footer: 'Menu /profil · Réputation du personnage actif',
  });

  return interaction.update({ embeds: [createCanvasEmbed(fileName, 0xffdf91)], components: getMainRows(), files: [attachment] });
}

module.exports = {
  openProfileHub,
  showCreateModal,
  handleCreateModal,
  showSwitchMenu,
  handleSwitchSelect,
  showEditModal,
  handleEditModal,
  showImageModal,
  handleImageModal,
  showInventory,
  showMissions,
  showRelations,
  showRumors,
  showReputation,
};
