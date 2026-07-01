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
  MessageFlags,
} = require('discord.js');

const Profile = require('../../models/Profile');
const ProfileMission = require('../../models/ProfileMission');
const Relation = require('../../models/Relation');
const Rumor = require('../../models/Rumor');
const ReputationLog = require('../../models/ReputationLog');

const { createProfileCanvas } = require('../../canvas/profileCanvas');
const { createPanelCanvas } = require('../../canvas/panelCanvas');

const {
  getInventorySummary,
  getInventoryDetails,
  formatInventoryLines,
} = require('../../utils/inventoryUtils');

const {
  getItemById,
  getRarityLabel,
  getTypeLabel,
} = require('../../data/items');

const {
  getOrCreatePlayer,
  getActiveProfile,
  setActiveProfile,
  countProfiles,
} = require('../../utils/activeProfile');

const { normalizeMageRank } = require('../../utils/ranks');
const { getReputationLabel } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');

const PROFILE_MENU_TIMEOUT_MS = 10 * 60 * 1000;

function createCanvasEmbed(fileName, color = 0x7c5cff) {
  return new EmbedBuilder()
    .setColor(color)
    .setImage(`attachment://${fileName}`);
}

function getMainRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Profil')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('profile:inventory')
        .setLabel('Inventaire')
        .setEmoji('🎒')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:missions')
        .setLabel('Missions')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:relations')
        .setLabel('Relations')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Secondary),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:rumors')
        .setLabel('Rumeurs')
        .setEmoji('🗣️')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:reputation')
        .setLabel('Réputation')
        .setEmoji('⭐')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:switch')
        .setLabel('Changer')
        .setEmoji('🔁')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('profile:edit')
        .setLabel('Modifier')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:image')
        .setLabel('Modifier l’image')
        .setEmoji('🖼️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}



function getNoProfileRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:create')
        .setLabel('Créer mon premier personnage')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Success),
    ),
  ];
}

function disableRows(rows) {
  return rows.map((row) => {
    const rawRow = row.toJSON();

    rawRow.components = rawRow.components.map((component) => ({
      ...component,
      disabled: true,
    }));

    return rawRow;
  });
}

function scheduleProfileMenuExpiration(message, rows) {
  if (!message || !rows?.length) return;

  setTimeout(async () => {
    try {
      await message.edit({
        components: disableRows(rows),
      });
    } catch (_) {
      // Message supprimé, déjà expiré, bot redémarré, ou interaction devenue inaccessible.
    }
  }, PROFILE_MENU_TIMEOUT_MS);
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

    await interaction.update(updatePayload);

    return interaction.message;
  }

  if (interaction.replied || interaction.deferred) {
    await interaction.editReply(payload);

    return interaction.fetchReply().catch(() => null);
  }

  await interaction.reply(payload);

  return interaction.fetchReply().catch(() => null);
}

async function openProfileHub(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    const rows = getNoProfileRows();

    const embed = new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle('Fairy Slayer — Aucun personnage actif')
      .setDescription(
        'Tu n’as pas encore de personnage. Crée ton premier profil RP pour commencer à gagner de l’XP, des Jewels et utiliser les menus du bot.',
      );

    const message = await replyOrUpdate(interaction, {
      embeds: [embed],
      components: rows,
      files: [],
      ephemeral: true,
    });

    scheduleProfileMenuExpiration(message, rows);

    return message;
  }

  const rows = getMainRows();
  const fileName = 'fairy-slayer-profil.png';
  const attachment = await createProfileCanvas(profile, interaction.user);

  const message = await replyOrUpdate(interaction, {
    embeds: [createCanvasEmbed(fileName)],
    components: rows,
    files: [attachment],
    ephemeral: false,
  });

  scheduleProfileMenuExpiration(message, rows);

  return message;
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
  const powerLevel = Math.max(
    0,
    Math.min(999999, Number.parseInt(rawPower || '100', 10) || 100),
  );

  const profile = await Profile.create({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    characterName,
    age,
    magicType,
    mageRank,
    powerLevel,
  });

  await Inventory.create({
    profileId: profile._id,
    items: [],
  });

  await setActiveProfile(interaction.user.id, interaction.guildId, profile._id);

  return openProfileHub(interaction);
}

async function showSwitchMenu(interaction) {
  const profiles = await Profile.find({
    userId: interaction.user.id,
    guildId: interaction.guildId,
  })
    .sort({ createdAt: 1 })
    .limit(25);

  if (!profiles.length) {
    return openProfileHub(interaction);
  }

  const options = profiles.map((profile) => new StringSelectMenuOptionBuilder()
    .setLabel(truncateText(profile.characterName, 90))
    .setDescription(
      `${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Niveau ${profile.level}`.slice(0, 100),
    )
    .setValue(String(profile._id)));

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile:switch:select')
    .setPlaceholder('Choisis ton personnage actif')
    .addOptions(options);

  const rows = [
    new ActionRowBuilder().addComponents(select),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:create')
        .setLabel('Créer un autre perso')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  const fileName = 'fairy-slayer-profils.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'profile',
    section: 'Changer de personnage',
    title: `${profiles.length} profil(s) disponible(s)`,
    subtitle: 'Le profil actif reçoit l’XP, les Jewels, les missions et les actions RP.',
    lines: profiles.map((profile, index) => (
      `${index + 1}. ${profile.characterName} — Rang ${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Niveau ${profile.level}`
    )),
    footer: 'Utilise le menu déroulant sous le Canvas pour choisir ton personnage actif.',
  });

  await interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: rows,
    files: [attachment],
  });

  scheduleProfileMenuExpiration(interaction.message, rows);

  return interaction.message;
}

async function handleSwitchSelect(interaction) {
  const profileId = interaction.values[0];

  const profile = await Profile.findOne({
    _id: profileId,
    userId: interaction.user.id,
    guildId: interaction.guildId,
  });

  if (!profile) {
    return interaction.reply({
      content: 'Ce profil est introuvable.',
      ephemeral: true,
    });
  }

  await setActiveProfile(interaction.user.id, interaction.guildId, profile._id);

  return openProfileHub(interaction);
}

async function showEditModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

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
        .setValue(profile.characterName || ''),
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
        .setValue(profile.magicType || ''),
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

  if (!profile) {
    return openProfileHub(interaction);
  }

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

  if (!profile) {
    return openProfileHub(interaction);
  }

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
  await interaction.deferReply({
    flags: MessageFlags.Ephemeral,
  });

  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.editReply({
      content: 'Tu n’as aucun personnage actif. Relance `/profil` pour créer ou sélectionner un personnage.',
    });
  }

  const avatarUrl = interaction.fields.getTextInputValue('avatarUrl')?.trim() || null;

  if (!isValidHttpUrl(avatarUrl)) {
    return interaction.editReply({
      content: 'Le lien image doit commencer par `http://` ou `https://`. Laisse le champ vide pour retirer l’image du personnage.',
    });
  }

  let normalizedAvatarUrl = avatarUrl;

if (avatarUrl) {
  try {
    const parsed = new URL(avatarUrl);

    if (parsed.hostname === 'media.discordapp.net') {
      parsed.hostname = 'cdn.discordapp.com';
    }

    normalizedAvatarUrl = parsed.toString();
  } catch (_) {
    normalizedAvatarUrl = avatarUrl;
  }
}

profile.avatarUrl = normalizedAvatarUrl;

  profile.avatarUrl = normalizedAvatarUrl;
  await profile.save();

  if (!avatarUrl) {
    return interaction.editReply({
      content: '✅ Image retirée du profil. Relance `/profil` ou clique sur **Profil** pour actualiser la carte.',
    });
  }

  return interaction.editReply({
    content: '✅ Image du personnage mise à jour. Relance `/profil` ou clique sur **Profil** pour actualiser la carte.',
  });
}

function getInventoryItemSelectRow(items) {
  if (!items.length) return null;

  const options = items.slice(0, 25).map((item) => (
    new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setDescription(`x${item.quantity} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)}`.slice(0, 100))
      .setValue(item.itemId)
  ));

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile:inventory:item')
    .setPlaceholder('Voir le détail d’un objet')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

function getInventoryRowsWithSelect(items, activeCategory = 'all') {
  const rows = [];

  const selectRow = getInventoryItemSelectRow(items);

  if (selectRow) {
    rows.push(selectRow);
  }

  return [
    ...rows,
    ...getInventoryCategoryRows(activeCategory),
  ];
}

function getInventoryCategoryLabel(category = 'all') {
  const labels = {
    all: 'Tout l’inventaire',
    consommable: 'Consommables',
    equipement: 'Équipements',
    lacrima: 'Lacrimas',
    rare: 'Objets rares',
    mission: 'Objets de mission',
  };

  return labels[category] || 'Tout l’inventaire';
}

function getInventoryCategoryRows(activeCategory = 'all') {
  const getStyle = (category) => (
    activeCategory === category ? ButtonStyle.Primary : ButtonStyle.Secondary
  );

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:inventory:all')
        .setLabel('Tout')
        .setEmoji('🎒')
        .setStyle(getStyle('all')),

      new ButtonBuilder()
        .setCustomId('profile:inventory:consommable')
        .setLabel('Consommables')
        .setEmoji('🧪')
        .setStyle(getStyle('consommable')),

      new ButtonBuilder()
        .setCustomId('profile:inventory:equipement')
        .setLabel('Équipements')
        .setEmoji('🛡️')
        .setStyle(getStyle('equipement')),

      new ButtonBuilder()
        .setCustomId('profile:inventory:lacrima')
        .setLabel('Lacrimas')
        .setEmoji('💠')
        .setStyle(getStyle('lacrima')),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:inventory:rare')
        .setLabel('Rares')
        .setEmoji('💎')
        .setStyle(getStyle('rare')),

      new ButtonBuilder()
        .setCustomId('profile:inventory:mission')
        .setLabel('Mission')
        .setEmoji('📜')
        .setStyle(getStyle('mission')),

      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour profil')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function filterInventoryItems(items, category = 'all') {
  if (category === 'all') return items;

  return items.filter((item) => item.type === category);
}

function countInventoryType(items, type) {
  return items
    .filter((item) => item.type === type)
    .reduce((total, item) => total + Number(item.quantity || 0), 0);
}

async function showInventory(interaction, category = 'all') {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const summary = await getInventorySummary(profile._id);
  const filteredItems = filterInventoryItems(summary.items, category);
  const lines = formatInventoryLines(filteredItems, 8);

  const filteredQuantity = filteredItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );

  const filteredValue = filteredItems.reduce(
    (total, item) => total + Number(item.sellPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const fileName = 'fairy-slayer-inventaire.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Inventaire — ${profile.characterName}`,
    title: getInventoryCategoryLabel(category),
    subtitle: `${formatNumber(filteredQuantity)} objet(s) affiché(s) - valeur : ${formatNumber(filteredValue)} Jewels`,
    stats: [
      { label: 'Total', value: formatNumber(summary.totalQuantity) },
      { label: 'Consommables', value: formatNumber(countInventoryType(summary.items, 'consommable')) },
      { label: 'Équipements', value: formatNumber(countInventoryType(summary.items, 'equipement')) },
      { label: 'Lacrimas', value: formatNumber(countInventoryType(summary.items, 'lacrima')) },
    ],
    lines,
    footer: `Menu /profil - Inventaire - ${getInventoryCategoryLabel(category)}`,
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0x2b8cff)],
    components: getInventoryRowsWithSelect(filteredItems, category),
    files: [attachment],
  });
}

async function showInventoryItem(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const itemId = interaction.values[0];
  const item = getItemById(itemId);

  if (!item) {
    return interaction.reply({
      content: 'Objet introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const ownedItem = inventoryItems.find((entry) => entry.itemId === item.itemId);

  if (!ownedItem) {
    return interaction.reply({
      content: `Tu ne possèdes pas **${item.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const fileName = 'fairy-slayer-objet.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Objet — ${profile.characterName}`,
    title: item.name,
    subtitle: item.description,
    stats: [
      { label: 'Quantité', value: formatNumber(ownedItem.quantity) },
      { label: 'Type', value: getTypeLabel(item.type) },
      { label: 'Rareté', value: getRarityLabel(item.rarity) },
      { label: 'Revente', value: `${formatNumber(item.sellPrice)} Jewels` },
    ],
    lines: [
      `Nom : ${item.name}`,
      `Description : ${item.description}`,
      `Type : ${getTypeLabel(item.type)}`,
      `Rareté : ${getRarityLabel(item.rarity)}`,
      `Prix boutique : ${formatNumber(item.basePrice)} Jewels`,
      `Prix de revente : ${formatNumber(item.sellPrice)} Jewels`,
      `Rang requis : ${item.requiredRank || 'C'}`,
      `Puissance requise : ${formatNumber(item.requiredPower || 0)}`,
    ],
    footer: 'Menu /profil - Fiche détail d’objet',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0x2b8cff)],
    components: getInventoryRowsWithSelect(inventoryItems, 'all'),
    files: [attachment],
  });
}

async function showMissions(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const active = await ProfileMission.countDocuments({
    profileId: profile._id,
    status: 'active',
  });

  const completed = await ProfileMission.countDocuments({
    profileId: profile._id,
    status: 'completed',
  });

  const failed = await ProfileMission.countDocuments({
    profileId: profile._id,
    status: 'failed',
  });

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

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0xffb347)],
    components: getMainRows(),
    files: [attachment],
  });
}

async function showRelations(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const relations = await Relation.find({
    ownerProfileId: profile._id,
  })
    .limit(8)
    .populate('targetProfileId');

  const lines = relations.length
    ? relations.map((relation) => (
      `${relation.targetProfileId?.characterName || 'Personnage inconnu'} — ${relation.type} · confiance ${relation.trust}% · tension ${relation.tension}%`
    ))
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

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0x64d2a6)],
    components: getMainRows(),
    files: [attachment],
  });
}

async function showRumors(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const now = new Date();

  const rumors = await Rumor.find({
    targetProfileId: profile._id,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(8);

  const lines = rumors.length
    ? rumors.map((rumor) => (
      `${rumor.type} · crédibilité ${rumor.credibility}% — ${truncateText(rumor.content, 110)}`
    ))
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

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0xc084fc)],
    components: getMainRows(),
    files: [attachment],
  });
}

async function showReputation(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const logs = await ReputationLog.find({
    profileId: profile._id,
  })
    .sort({ createdAt: -1 })
    .limit(5);

  const lines = logs.length
    ? logs.map((log) => (
      `${log.amount > 0 ? '+' : ''}${log.amount} — ${truncateText(log.reason, 90)}`
    ))
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
    lines: [
      'Derniers changements :',
      ...lines,
    ],
    footer: 'Menu /profil · Réputation du personnage actif',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName, 0xffdf91)],
    components: getMainRows(),
    files: [attachment],
  });
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
  showInventoryItem,
};