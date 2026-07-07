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
const GachaAccount = require('../../models/GachaAccount');
const GachaCard = require('../../models/GachaCard');
const CombatStats = require('../../models/CombatStats');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { normalizeMageRank } = require('../../utils/ranks');
const { clampReputation } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');
const { applyXp } = require('../../utils/xp');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const {
  getOrCreateGuildConfig,
  parseDiscordIdList,
  parseProfileSlotRules,
  hasConfiguredStaffPermission,
  formatChannelList,
  formatRoleList,
  formatSlotRules,
  sendGuildLog,
} = require('../../utils/guildConfig');

const {
  addItemToInventory,
  removeItemFromInventory,
  getInventoryDetails,
} = require('../../utils/inventoryUtils');

const {
  getAllItems,
  getRarityLabel,
  getTypeLabel,
} = require('../../data/items');
const { FAIRY_TAIL_CARDS } = require('../../data/fairyTailCards');

function createCanvasEmbed(fileName) {
  return new EmbedBuilder()
    .setColor(0xff6b6b)
    .setImage(`attachment://${fileName}`);
}

async function hasAdminPermission(interaction) {
  return hasConfiguredStaffPermission(interaction);
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
        .setCustomId('admin:jewels_profile')
        .setLabel('Joyaux')
        .setEmoji('💎')
        .setStyle(ButtonStyle.Success),

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
        .setCustomId('admin:inspect_profile')
        .setLabel('Inspecter profil')
        .setEmoji('🔎')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:config_info')
        .setLabel('Configuration')
        .setEmoji('🧩')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

function getConfigRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin:config_rp_channels')
        .setLabel('Salons RP')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('admin:config_logs')
        .setLabel('Logs')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:config_staff_roles')
        .setLabel('Roles staff')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary),
    ),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('admin:config_profile_slots')
        .setLabel('Slots profils')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:config_xp')
        .setLabel('XP RP')
        .setEmoji('✨')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('admin:home')
        .setLabel('Retour')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
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

async function findProfileByName(interaction, characterName) {
  return Profile.findOne({
    guildId: interaction.guildId,
    characterName: getProfileNameRegex(characterName),
  });
}

function normalizeItemSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findItemByNameOrId(input) {
  const query = normalizeItemSearch(input);
  const items = getAllItems();

  if (!query) {
    return {
      item: null,
      matches: [],
      ambiguous: false,
    };
  }

  const exactMatch = items.find((item) => (
    normalizeItemSearch(item.itemId) === query
    || normalizeItemSearch(item.name) === query
  ));

  if (exactMatch) {
    return {
      item: exactMatch,
      matches: [exactMatch],
      ambiguous: false,
    };
  }

  const partialMatches = items.filter((item) => (
    normalizeItemSearch(item.itemId).includes(query)
    || normalizeItemSearch(item.name).includes(query)
  ));

  if (partialMatches.length === 1) {
    return {
      item: partialMatches[0],
      matches: partialMatches,
      ambiguous: false,
    };
  }

  if (partialMatches.length > 1) {
    return {
      item: null,
      matches: partialMatches,
      ambiguous: true,
    };
  }

  return {
    item: null,
    matches: [],
    ambiguous: false,
  };
}

function formatItemSearchMatches(matches) {
  return matches
    .slice(0, 8)
    .map((item) => `${item.emoji || '📦'} ${item.name} — \`${item.itemId}\``)
    .join('\n');
}

function parseSignedInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parsePositiveInteger(value, fallback = 1, max = 99) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(max, parsed));
}

async function openAdminHub(interaction) {
  if (!(await hasAdminPermission(interaction))) {
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
      'Modifier les profils : rang, puissance, Joyaux et réputation.',
      'Gérer la progression : ajouter ou retirer de l’XP.',
      'Gérer les inventaires : donner ou retirer des objets par nom ou par ID.',
      'Voir le catalogue d’objets disponible dans la boutique.',
    ],
    footer: 'Utilise les boutons sous le Canvas pour administrer Fairy Slayer.',
  });

  const payload = createLargeCanvasPayload({ attachment, components: getAdminRows() });
  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    return interaction.update(payload);
  }
  return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
}

async function showRecentProfiles(interaction) {
  const profiles = await Profile.find({
    guildId: interaction.guildId,
  })
    .sort({ updatedAt: -1 })
    .limit(10);

  const lines = profiles.length
    ? profiles.map((profile) => (
      `${profile.characterName} - joueur ${profile.userId} - Rang ${profile.mageRank} - Puissance ${formatNumber(profile.powerLevel)} - Joyaux ${formatNumber(profile.jewels)} - Rep ${profile.reputation}`
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
    ...createLargeCanvasPayload({
      attachment,
      components: getAdminRows(),
    }),
  });
}

async function showItemCatalog(interaction) {
  const items = getAllItems();

  const lines = items.map((item) => (
    `${item.emoji || '📦'} ${item.name} - ID ${item.itemId} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)} - achat ${formatNumber(item.basePrice)} - revente ${formatNumber(item.sellPrice)}`
  ));

  const fileName = 'fairy-slayer-admin-objets.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Catalogue objets',
    title: `${items.length} objet(s) disponible(s)`,
    subtitle: 'Pour donner ou retirer un objet, le nom suffit. L’ID reste accepté.',
    lines,
    footer: 'Menu /admin - Catalogue objets',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getAdminRows(),
    }),
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
        .setLabel('Joyaux à ajouter ou retirer')
        .setPlaceholder('Exemple : 500 ou -200. Laisser vide pour 0')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(10),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reputationDelta')
        .setLabel('Réputation à ajouter ou retirer')
        .setPlaceholder('Exemple : 5 ou -3. Laisser vide pour 0')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(8),
    ),
  );

  return interaction.showModal(modal);
}

async function showInspectProfileModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:inspect_profile:modal')
    .setTitle('Inspecter un profil');
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
  );
  return interaction.showModal(modal);
}

async function handleInspectProfileModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const profile = await findProfileByName(interaction, characterName);
  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }
  const [items, gachaAccount, gachaCards, combatStats] = await Promise.all([
    getInventoryDetails(profile._id),
    GachaAccount.findOne({ userId: profile.userId, guildId: interaction.guildId }).lean(),
    GachaCard.countDocuments({ userId: profile.userId, guildId: interaction.guildId }),
    CombatStats.findOne({ userId: profile.userId, guildId: interaction.guildId }).lean(),
  ]);
  const equipped = items.filter((item) => item.equipped);
  const equipmentBonus = equipped.reduce((total, item) => total + Number(item.powerBonus || 0), 0);
  const lines = [
    `Joueur : <@${profile.userId}> — ID ${profile.userId}`,
    `Rang ${profile.mageRank} — Niveau ${profile.level} — XP ${formatNumber(profile.xp)}`,
    `Puissance : ${formatNumber(profile.powerLevel)} + ${formatNumber(equipmentBonus)} équipement`,
    `Joyaux : ${formatNumber(profile.jewels)} — Réputation : ${profile.reputation}`,
    `Inventaire : ${items.reduce((total, item) => total + item.quantity, 0)} objet(s) — ${equipped.length}/4 équipé(s)`,
    `Gacha : ${gachaCards}/${FAIRY_TAIL_CARDS.length} cartes — ${formatNumber(gachaAccount?.fragments || 0)} fragments — ${formatNumber(gachaAccount?.totalPulls || 0)} tirages`,
    `Combats : PvE ${combatStats?.pveWins || 0}V/${combatStats?.pveLosses || 0}D — PvP ${combatStats?.pvpWins || 0}V/${combatStats?.pvpLosses || 0}D`,
    ...equipped.map((item) => `${item.equipSlotLabel} : ${item.name} (+${formatNumber(item.powerBonus || 0)})`),
  ];
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-admin-inspection.png', variant: 'admin',
    section: 'Inspection profil', title: profile.characterName,
    subtitle: `${profile.magicType} — ${profile.guildName}`,
    lines, footer: 'Inspection en lecture seule — aucune donnée modifiée.',
  });
  return interaction.reply({
    ...createLargeCanvasPayload({ attachment }), flags: MessageFlags.Ephemeral,
  });
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
    const power = Math.max(0, Math.min(999999, parseSignedInteger(powerLevelInput, 0)));
    profile.powerLevel = power;
    changes.push(`Puissance : ${formatNumber(power)}`);
  }

  const jewelsDelta = parseSignedInteger(jewelsDeltaInput, 0);

  if (jewelsDelta !== 0) {
    profile.jewels = Math.max(0, Number(profile.jewels || 0) + jewelsDelta);
    changes.push(`Joyaux : ${formatNumber(profile.jewels)} (${jewelsDelta > 0 ? '+' : ''}${formatNumber(jewelsDelta)})`);
  }

  const reputationDelta = parseSignedInteger(reputationDeltaInput, 0);

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
  await sendGuildLog(interaction.guild, 'Profil modifié par le staff', [
    `Profil : **${profile.characterName}** (<@${profile.userId}>)`,
    `Par <@${interaction.user.id}>`,
    ...(changes.length ? changes : ['Aucune valeur modifiée']),
  ]);

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
    ...createLargeCanvasPayload({
      attachment,
    }),
    flags: MessageFlags.Ephemeral,
  });
}

async function showJewelsModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('admin:jewels_profile:modal')
    .setTitle('Ajouter ou retirer des Joyaux');

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
        .setCustomId('jewelsDelta')
        .setLabel('Joyaux à ajouter ou retirer')
        .setPlaceholder('Exemple : 500 ou -200')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(10),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Raison')
        .setPlaceholder('Exemple : récompense de mission')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(120),
    ),
  );

  return interaction.showModal(modal);
}

async function handleJewelsModal(interaction) {
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const jewelsDeltaInput = interaction.fields.getTextInputValue('jewelsDelta')?.trim();
  const reason = interaction.fields.getTextInputValue('reason')?.trim() || 'Modification staff via /admin';

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const jewelsDelta = parseSignedInteger(jewelsDeltaInput, 0);

  if (jewelsDelta === 0) {
    return interaction.reply({
      content: 'La valeur de Joyaux doit être différente de 0. Exemple : `500` ou `-200`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const before = Number(profile.jewels || 0);
  profile.jewels = Math.max(0, before + jewelsDelta);

  await profile.save();
  await sendGuildLog(interaction.guild, 'Joyaux modifiés', [
    `Profil : **${profile.characterName}** (<@${profile.userId}>)`,
    `Variation : ${jewelsDelta > 0 ? '+' : ''}${jewelsDelta}`,
    `Nouveau solde : ${profile.jewels}`, `Par <@${interaction.user.id}>`, `Raison : ${reason}`,
  ], 0x57f287);

  const fileName = 'fairy-slayer-admin-joyaux.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Joyaux modifiés',
    title: profile.characterName,
    subtitle: reason,
    lines: [
      `Modification : ${jewelsDelta > 0 ? '+' : ''}${formatNumber(jewelsDelta)} Joyaux`,
      `Ancien solde : ${formatNumber(before)} Joyaux`,
      `Nouveau solde : ${formatNumber(profile.jewels)} Joyaux`,
      `Modifié par : ${interaction.user.tag}`,
    ],
    footer: 'Menu /admin - Modification des Joyaux enregistrée',
  });

  return interaction.reply({
    ...createLargeCanvasPayload({
      attachment,
    }),
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
  const xpDelta = parseSignedInteger(xpDeltaInput, 0);

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const oldLevel = Number(profile.level || 1);

  if (xpDelta >= 0) {
    applyXp(profile, xpDelta);
  } else {
    profile.xp = Math.max(0, Number(profile.xp || 0) + xpDelta);
  }

  await profile.save();
  await sendGuildLog(interaction.guild, 'XP modifiée', [
    `Profil : **${profile.characterName}** (<@${profile.userId}>)`,
    `Variation : ${xpDelta > 0 ? '+' : ''}${xpDelta} XP`,
    `Niveau : ${oldLevel} → ${profile.level}`, `Par <@${interaction.user.id}>`,
  ], 0xf7d078);

  const lines = [
    `XP modifiée : ${xpDelta > 0 ? '+' : ''}${formatNumber(xpDelta)}`,
    `Niveau : ${oldLevel} -> ${profile.level}`,
    `XP actuelle : ${formatNumber(profile.xp)}`,
    `Joyaux actuels : ${formatNumber(profile.jewels)}`,
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
    ...createLargeCanvasPayload({
      attachment,
    }),
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
        .setCustomId('itemInput')
        .setLabel('Nom ou ID de l’objet')
        .setPlaceholder('Exemple : Potion de soin mineure')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120),
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
  const itemInput = interaction.fields.getTextInputValue('itemInput').trim();
  const quantityInput = interaction.fields.getTextInputValue('quantity')?.trim();
  const quantity = parsePositiveInteger(quantityInput, 1, 99);

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const itemSearch = findItemByNameOrId(itemInput);

  if (itemSearch.ambiguous) {
    return interaction.reply({
      content: `Plusieurs objets correspondent à **${itemInput}** :\n${formatItemSearchMatches(itemSearch.matches)}\n\nSois plus précis dans le nom.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const item = itemSearch.item;

  if (!item) {
    return interaction.reply({
      content: `Objet introuvable : **${itemInput}**. Utilise le bouton **Objets** dans /admin pour voir les noms disponibles.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await addItemToInventory(profile._id, item.itemId, quantity);
  await sendGuildLog(interaction.guild, 'Objet donné', [
    `Profil : **${profile.characterName}** (<@${profile.userId}>)`,
    `Objet : **${item.name}** × ${quantity}`, `Par <@${interaction.user.id}>`,
  ], 0x57f287);

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
    ...createLargeCanvasPayload({
      attachment,
    }),
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
        .setCustomId('itemInput')
        .setLabel('Nom ou ID de l’objet')
        .setPlaceholder('Exemple : Potion de soin mineure')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120),
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
  const itemInput = interaction.fields.getTextInputValue('itemInput').trim();
  const quantityInput = interaction.fields.getTextInputValue('quantity')?.trim();
  const quantity = parsePositiveInteger(quantityInput, 1, 99);

  const profile = await findProfileByName(interaction, characterName);

  if (!profile) {
    return interaction.reply({
      content: `Aucun profil trouvé avec le nom exact **${truncateText(characterName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const itemSearch = findItemByNameOrId(itemInput);

  if (itemSearch.ambiguous) {
    return interaction.reply({
      content: `Plusieurs objets correspondent à **${itemInput}** :\n${formatItemSearchMatches(itemSearch.matches)}\n\nSois plus précis dans le nom.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const item = itemSearch.item;

  if (!item) {
    return interaction.reply({
      content: `Objet introuvable : **${itemInput}**. Utilise le bouton **Objets** dans /admin pour voir les noms disponibles.`,
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
  await sendGuildLog(interaction.guild, 'Objet retiré', [
    `Profil : **${profile.characterName}** (<@${profile.userId}>)`,
    `Objet : **${item.name}** × ${quantity}`, `Par <@${interaction.user.id}>`,
  ], 0xed4245);

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
    ...createLargeCanvasPayload({
      attachment,
    }),
    flags: MessageFlags.Ephemeral,
  });
}

function hasConfigPermission(interaction) {
  return interaction.memberPermissions?.has('ManageGuild')
    || interaction.memberPermissions?.has('Administrator');
}

function configInput(customId, label, placeholder, required = false) {
  return new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId(customId).setLabel(label).setPlaceholder(placeholder)
      .setStyle(TextInputStyle.Paragraph).setRequired(required).setMaxLength(1000),
  );
}

async function showConfigModal(interaction, type) {
  if (!hasConfigPermission(interaction)) {
    return interaction.reply({ content: 'La configuration nécessite la permission **Gérer le serveur**.', flags: MessageFlags.Ephemeral });
  }
  const config = await getOrCreateGuildConfig(interaction.guildId);
  const modal = new ModalBuilder().setCustomId(`admin:config_${type}:modal`).setTitle('Configuration Fairy Slayer');
  if (type === 'rp_channels') modal.addComponents(configInput('channelIds', 'Salons RP (mentions ou IDs)', '#rp-ville, #rp-guilde — vide = aucun'));
  if (type === 'logs') modal.addComponents(configInput('channelId', 'Salon de logs (mention ou ID)', '#logs-fairy-slayer — vide = désactivé'));
  if (type === 'staff_roles') modal.addComponents(configInput('roleIds', 'Rôles staff (mentions ou IDs)', '@Modérateur, @Maître du jeu — vide = aucun'));
  if (type === 'profile_slots') modal.addComponents(
    configInput('defaultSlots', 'Slots par défaut (1 à 20)', String(config.defaultProfileSlots || 3), true),
    configInput('rules', 'Règles rôle = slots', '@VIP = 5, @Booster = 7 — vide = aucune'),
  );
  if (type === 'xp') modal.addComponents(
    configInput('cooldown', 'Cooldown XP en secondes', String(config.xpCooldownSeconds || 45), true),
    configInput('minLength', 'Longueur minimale du message', String(config.minMessageLength || 25), true),
  );
  return interaction.showModal(modal);
}

async function handleConfigModal(interaction, type) {
  if (!hasConfigPermission(interaction)) {
    return interaction.reply({ content: 'Permission **Gérer le serveur** requise.', flags: MessageFlags.Ephemeral });
  }
  const config = await getOrCreateGuildConfig(interaction.guildId);
  const changes = [];
  if (type === 'rp_channels') {
    config.rpChannelIds = parseDiscordIdList(interaction.fields.getTextInputValue('channelIds'));
    changes.push(`Salons RP : ${formatChannelList(config.rpChannelIds)}`);
  } else if (type === 'logs') {
    const ids = parseDiscordIdList(interaction.fields.getTextInputValue('channelId'));
    config.logChannelId = ids[0] || null;
    changes.push(`Salon de logs : ${config.logChannelId ? `<#${config.logChannelId}>` : 'Désactivé'}`);
  } else if (type === 'staff_roles') {
    config.staffRoleIds = parseDiscordIdList(interaction.fields.getTextInputValue('roleIds'));
    changes.push(`Rôles staff : ${formatRoleList(config.staffRoleIds)}`);
  } else if (type === 'profile_slots') {
    config.defaultProfileSlots = parsePositiveInteger(interaction.fields.getTextInputValue('defaultSlots'), 3, 20);
    config.profileSlotRoleRules = parseProfileSlotRules(interaction.fields.getTextInputValue('rules'));
    changes.push(`Slots par défaut : ${config.defaultProfileSlots}`, `Règles :\n${formatSlotRules(config.profileSlotRoleRules)}`);
  } else if (type === 'xp') {
    config.xpCooldownSeconds = Math.max(5, Math.min(3600, parseSignedInteger(interaction.fields.getTextInputValue('cooldown'), 45)));
    config.minMessageLength = Math.max(1, Math.min(500, parseSignedInteger(interaction.fields.getTextInputValue('minLength'), 25)));
    changes.push(`Cooldown XP : ${config.xpCooldownSeconds}s`, `Longueur minimale : ${config.minMessageLength} caractères`);
  }
  await config.save();
  await sendGuildLog(interaction.guild, 'Configuration serveur modifiée', [`Par <@${interaction.user.id}>`, ...changes], 0xff6b6b);
  return interaction.reply({ content: `✅ Configuration enregistrée.\n${changes.join('\n')}`, flags: MessageFlags.Ephemeral });
}

async function showConfigInfo(interaction) {
  const config = await getOrCreateGuildConfig(interaction.guildId);
  const fileName = 'fairy-slayer-admin-config.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'admin',
    section: 'Configuration',
    title: 'Paramètres serveur',
    subtitle: 'Paramètres actifs pour ce serveur Discord.',
    lines: [
      `Salons RP avec gain d’XP : ${formatChannelList(config.rpChannelIds)}`,
      `Salon de logs : ${config.logChannelId ? `<#${config.logChannelId}>` : 'Désactivé'}`,
      `Rôles staff : ${formatRoleList(config.staffRoleIds)}`,
      `Slots par défaut : ${config.defaultProfileSlots}`,
      `Slots selon les rôles : ${formatSlotRules(config.profileSlotRoleRules)}`,
      `XP RP : cooldown ${config.xpCooldownSeconds}s, minimum ${config.minMessageLength} caractères.`,
    ],
    footer: 'Menu /admin - Configuration',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getConfigRows(),
    }),
  });
}

async function handleAdminComponent(interaction) {
  if (!(await hasAdminPermission(interaction))) {
    return interaction.reply({
      content: 'Tu n’as pas la permission d’utiliser cette action.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === 'admin:list_profiles') return showRecentProfiles(interaction);
  if (interaction.customId === 'admin:edit_profile') return showEditProfileModal(interaction);
  if (interaction.customId === 'admin:jewels_profile') return showJewelsModal(interaction);
  if (interaction.customId === 'admin:xp_profile') return showXpModal(interaction);
  if (interaction.customId === 'admin:item_catalog') return showItemCatalog(interaction);
  if (interaction.customId === 'admin:give_item') return showGiveItemModal(interaction);
  if (interaction.customId === 'admin:remove_item') return showRemoveItemModal(interaction);
  if (interaction.customId === 'admin:inspect_profile') return showInspectProfileModal(interaction);
  if (interaction.customId === 'admin:config_info') return showConfigInfo(interaction);
  if (interaction.customId === 'admin:home') return openAdminHub(interaction);
  if (interaction.customId === 'admin:config_rp_channels') return showConfigModal(interaction, 'rp_channels');
  if (interaction.customId === 'admin:config_logs') return showConfigModal(interaction, 'logs');
  if (interaction.customId === 'admin:config_staff_roles') return showConfigModal(interaction, 'staff_roles');
  if (interaction.customId === 'admin:config_profile_slots') return showConfigModal(interaction, 'profile_slots');
  if (interaction.customId === 'admin:config_xp') return showConfigModal(interaction, 'xp');

  return interaction.reply({
    content: 'Action admin inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAdminModal(interaction) {
  if (!(await hasAdminPermission(interaction))) {
    return interaction.reply({
      content: 'Tu n’as pas la permission d’utiliser cette action.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (interaction.customId === 'admin:edit_profile:modal') return handleEditProfileModal(interaction);
  if (interaction.customId === 'admin:jewels_profile:modal') return handleJewelsModal(interaction);
  if (interaction.customId === 'admin:xp_profile:modal') return handleXpModal(interaction);
  if (interaction.customId === 'admin:give_item:modal') return handleGiveItemModal(interaction);
  if (interaction.customId === 'admin:remove_item:modal') return handleRemoveItemModal(interaction);
  if (interaction.customId === 'admin:inspect_profile:modal') return handleInspectProfileModal(interaction);
  if (interaction.customId === 'admin:config_rp_channels:modal') return handleConfigModal(interaction, 'rp_channels');
  if (interaction.customId === 'admin:config_logs:modal') return handleConfigModal(interaction, 'logs');
  if (interaction.customId === 'admin:config_staff_roles:modal') return handleConfigModal(interaction, 'staff_roles');
  if (interaction.customId === 'admin:config_profile_slots:modal') return handleConfigModal(interaction, 'profile_slots');
  if (interaction.customId === 'admin:config_xp:modal') return handleConfigModal(interaction, 'xp');

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
