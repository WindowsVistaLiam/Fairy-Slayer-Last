const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const Profile = require('../../models/Profile');
const ReputationLog = require('../../models/ReputationLog');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { normalizeMageRank } = require('../../utils/ranks');
const { clampReputation } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');
const { applyXp } = require('../../utils/xp');

const {
  addItemToInventory,
  removeItemFromInventory,
  getInventoryDetails,
} = require('../../utils/inventoryUtils');

const {
  getAllItems,
  getItemById,
  getRarityLabel,
  getTypeLabel,
} = require('../../data/items');

function createCanvasEmbed(fileName) {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setImage(`attachment://${fileName}`);
}

function hasAdminPermission(interaction) {
  return interaction.memberPermissions?.has('ManageGuild')
    || interaction.memberPermissions?.has('Administrator');
}

function getAdminRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin:list_profiles')
        .setLabel('Profils récents')
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('admin:edit_profile')
        .setLabel('Modifier profil')
        .setEmoji('⚙️')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:xp_profile')
        .setLabel('XP')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:item_catalog')
        .setLabel('Objets')
        .setEmoji('📦')
        .setStyle(ButtonStyle.Secondary),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin:give_item')
        .setLabel('Donner objet')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('admin:remove_item')
        .setLabel('Retirer objet')
        .setEmoji('➖')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('admin:config_info')
        .setLabel('Configuration')
        .setEmoji('🧩')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function getProfileNameRegex(characterName) {
  return {
    $regex: `^${characterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
    $options: 'i',
  };
}

async function findProfileByName(interaction, characterName) {
  return Profile.findOne({
    guildId: interaction.guildId,
    characterName: getProfileNameRegex(characterName),
  });
}

async function openAdminHub(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({
      content: 'Tu n’as pas la permission d’utiliser le menu admin.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const fileName = 'fairy-slayer-admin.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Menu admin',
    title: 'Gestion Fairy Slayer',
    subtitle: 'Menu réservé au staff du serveur.',
    lines: [
      'Modifier les profils : rang, puissance, Jewels et réputation.',
      'Gérer la progression : ajouter ou retirer de l’XP.',
      'Gérer les inventaires : donner ou retirer des objets.',
      'Voir le catalogue d’objets disponible dans la boutique.',
    ],
    footer: 'Utilise les boutons sous le Canvas pour administrer Fairy Slayer.',
  });

  return interaction.reply({
    embeds: [createCanvasEmbed(fileName)],
    components: getAdminRows(),
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });
}

async function showRecentProfiles(interaction) {
  const profiles = await Profile.find({ guildId: interaction.guildId })
    .sort({ updatedAt: -1 })
    .limit(10);

  const lines = profiles.length
    ? profiles.map((profile) => (
      `${profile.characterName} - joueur ${profile.userId} - Rang ${profile.mageRank} - Puissance ${formatNumber(profile.powerLevel)} - Rep ${profile.reputation}`
    ))
    : ['Aucun profil trouvé.'];

  const fileName = 'fairy-slayer-admin-profils.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Profils récents',
    title: `${profiles.length} profil(s) affiché(s)`,
    subtitle: 'Derniers profils créés ou modifiés sur ce serveur.',
    lines,
    footer: 'Menu /admin - Profils récents',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: getAdminRows(),
    files: [attachment],
  });
}

async function showItemCatalog(interaction) {
  const items = getAllItems();

  const lines = items.map((item) => (
    `${item.itemId} - ${item.name} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)} - achat ${formatNumber(item.basePrice)} - revente ${formatNumber(item.sellPrice)}`
  ));

  const fileName = 'fairy-slayer-admin-objets.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Catalogue objets',
    title: `${items.length} objet(s) disponible(s)`,
    subtitle: 'Utilise les itemId pour donner ou retirer des objets.',
    lines,
    footer: 'Menu /admin - Catalogue objets',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: getAdminRows(),
    files: [attachment],
  });
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
        .setPlaceholder('Laisser vide. C, B, A, S ou Sacré')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('powerLevel')
        .setLabel('Nouveau niveau de puissance')
        .setPlaceholder('Laisser vide. Exemple : 1450')
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

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
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
    profile.jewels = Math.max(0, Number(profile.jewels || 0) + jewelsDelta);
    changes.push(`Jewels : ${formatNumber(profile.jewels)} (${jewelsDelta > 0 ? '+' : ''}${formatNumber(jewelsDelta)})`);
  }

  const reputationDelta = Number.parseInt(reputationDeltaInput || '0', 10) || 0;

  if (reputationDelta !== 0) {
    profile.reputation = clampReputation(Number(profile.reputation || 0) + reputationDelta);
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
    footer: 'Menu /admin - Modification staff enregistrée',
  });

  return interaction.reply({
    embeds: [createCanvasEmbed(fileName)],
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });
}

async function showXpModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:xp_profile:modal')
    .setTitle('Modifier l’XP');

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
        .setCustomId('xpDelta')
        .setLabel('XP à ajouter ou retirer')
        .setPlaceholder('Exemple : 500 ou -100')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10),
    ),
  );

  return interaction.showModal(modal);
}

async function handleXpModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const xpDeltaInput = interaction.fields.getTextInputValue('xpDelta')?.trim();
  const xpDelta = Number.parseInt(xpDeltaInput || '0', 10) || 0;

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const oldLevel = profile.level;

  if (xpDelta >= 0) {
    applyXp(profile, xpDelta);
  } else {
    profile.xp = Math.max(0, Number(profile.xp || 0) + xpDelta);
  }

  await profile.save();

  const lines = [
    `XP modifiée : ${xpDelta > 0 ? '+' : ''}${formatNumber(xpDelta)}`,
    `Niveau : ${oldLevel} -> ${profile.level}`,
    `XP actuelle : ${formatNumber(profile.xp)}`,
    `Jewels actuels : ${formatNumber(profile.jewels)}`,
  ];

  const fileName = 'fairy-slayer-admin-xp.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'XP modifiée',
    title: profile.characterName,
    subtitle: `Joueur Discord : ${profile.userId}`,
    lines,
    footer: 'Menu /admin - Modification XP enregistrée',
  });

  return interaction.reply({
    embeds: [createCanvasEmbed(fileName)],
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });
}

async function showGiveItemModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:give_item:modal')
    .setTitle('Donner un objet');

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
        .setCustomId('itemId')
        .setLabel('ID de l’objet')
        .setPlaceholder('Exemple : potion_soin_mineure')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('Quantité')
        .setPlaceholder('Exemple : 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(5),
    ),
  );

  return interaction.showModal(modal);
}

async function handleGiveItemModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const itemId = interaction.fields.getTextInputValue('itemId').trim();
  const quantityInput = interaction.fields.getTextInputValue('quantity')?.trim();
  const quantity = Math.max(1, Math.min(99, Number.parseInt(quantityInput || '1', 10) || 1));

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const item = getItemById(itemId);

  if (!item) {
    return interaction.reply({
      content: `Objet introuvable : \`${itemId}\`. Utilise le bouton **Objets** dans /admin pour voir les IDs.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await addItemToInventory(profile._id, item.itemId, quantity);

  const inventoryItems = await getInventoryDetails(profile._id);
  const owned = inventoryItems.find((inventoryItem) => inventoryItem.itemId === item.itemId);

  const fileName = 'fairy-slayer-admin-give-item.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Objet donné',
    title: profile.characterName,
    subtitle: `${item.name} ajouté à l’inventaire`,
    lines: [
      `Objet : ${item.name}`,
      `ID : ${item.itemId}`,
      `Quantité ajoutée : ${quantity}`,
      `Quantité possédée maintenant : ${owned?.quantity || quantity}`,
      `Type : ${getTypeLabel(item.type)} - Rareté : ${getRarityLabel(item.rarity)}`,
    ],
    footer: 'Menu /admin - Inventaire modifié',
  });

  return interaction.reply({
    embeds: [createCanvasEmbed(fileName)],
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });
}

async function showRemoveItemModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:remove_item:modal')
    .setTitle('Retirer un objet');

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
        .setCustomId('itemId')
        .setLabel('ID de l’objet')
        .setPlaceholder('Exemple : potion_soin_mineure')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('quantity')
        .setLabel('Quantité')
        .setPlaceholder('Exemple : 1')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(5),
    ),
  );

  return interaction.showModal(modal);
}

async function handleRemoveItemModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const itemId = interaction.fields.getTextInputValue('itemId').trim();
  const quantityInput = interaction.fields.getTextInputValue('quantity')?.trim();
  const quantity = Math.max(1, Math.min(99, Number.parseInt(quantityInput || '1', 10) || 1));

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const item = getItemById(itemId);

  if (!item) {
    return interaction.reply({
      content: `Objet introuvable : \`${itemId}\`. Utilise le bouton **Objets** dans /admin pour voir les IDs.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const removed = await removeItemFromInventory(profile._id, item.itemId, quantity);

  if (!removed) {
    return interaction.reply({
      content: `${profile.characterName} ne possède pas assez de **${item.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const owned = inventoryItems.find((inventoryItem) => inventoryItem.itemId === item.itemId);

  const fileName = 'fairy-slayer-admin-remove-item.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Objet retiré',
    title: profile.characterName,
    subtitle: `${item.name} retiré de l’inventaire`,
    lines: [
      `Objet : ${item.name}`,
      `ID : ${item.itemId}`,
      `Quantité retirée : ${quantity}`,
      `Quantité restante : ${owned?.quantity || 0}`,
      `Type : ${getTypeLabel(item.type)} - Rareté : ${getRarityLabel(item.rarity)}`,
    ],
    footer: 'Menu /admin - Inventaire modifié',
  });

  return interaction.reply({
    embeds: [createCanvasEmbed(fileName)],
    files: [attachment],
    flags: MessageFlags.Ephemeral,
  });
}

async function showConfigInfo(interaction) {
  const fileName = 'fairy-slayer-admin-config.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Configuration',
    title: 'Paramètres serveur',
    subtitle: 'La configuration avancée arrivera dans une prochaine étape.',
    lines: [
      'Prévu : salons RP qui donnent de l’XP.',
      'Prévu : salon de logs.',
      'Prévu : rôles staff.',
      'Prévu : slots de profils selon les rôles.',
    ],
    footer: 'Menu /admin - Configuration',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: getAdminRows(),
    files: [attachment],
  });
}

async function handleAdminComponent(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({
      content: 'Tu n’as pas la permission d’utiliser cette action.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === 'admin:list_profiles') return showRecentProfiles(interaction);
  if (interaction.customId === 'admin:edit_profile') return showEditProfileModal(interaction);
  if (interaction.customId === 'admin:xp_profile') return showXpModal(interaction);
  if (interaction.customId === 'admin:item_catalog') return showItemCatalog(interaction);
  if (interaction.customId === 'admin:give_item') return showGiveItemModal(interaction);
  if (interaction.customId === 'admin:remove_item') return showRemoveItemModal(interaction);
  if (interaction.customId === 'admin:config_info') return showConfigInfo(interaction);

  return interaction.reply({
    content: 'Action admin inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminModal(interaction) {
  if (!hasAdminPermission(interaction)) {
    return interaction.reply({
      content: 'Tu n’as pas la permission d’utiliser cette action.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === 'admin:edit_profile:modal') return handleEditProfileModal(interaction);
  if (interaction.customId === 'admin:xp_profile:modal') return handleXpModal(interaction);
  if (interaction.customId === 'admin:give_item:modal') return handleGiveItemModal(interaction);
  if (interaction.customId === 'admin:remove_item:modal') return handleRemoveItemModal(interaction);

  return interaction.reply({
    content: 'Formulaire admin inconnu.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openAdminHub,
  handleAdminComponent,
  handleAdminModal,
};