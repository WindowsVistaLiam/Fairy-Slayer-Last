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
  getOrCreateInventory,
  getInventorySummary,
  getInventoryDetails,
  removeItemFromInventory,
  equipItemInInventory,
  unequipItemInInventory,
  formatInventoryLines,
} = require('../../utils/inventoryUtils');

const {
  getItemById,
  getRarityLabel,
  getTypeLabel,
  getEquipSlotLabel,
  getItemEquipSlot,
  getItemPowerBonus,
} = require('../../data/items');

const {
  getActiveProfile,
  setActiveProfile,
  countProfiles,
} = require('../../utils/activeProfile');

const { getReputationLabel } = require('../../utils/reputation');
const { formatNumber, truncateText } = require('../../utils/format');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { getProfileSlotLimit } = require('../../utils/guildConfig');

const PROFILE_MENU_TIMEOUT_MS = 10 * 60 * 1000;
const INVENTORY_PAGE_SIZE = 25;

function createCanvasEmbed(fileName, color = 0x7c5cff) {
  return new EmbedBuilder()
    .setColor(color)
    .setImage(`attachment://${fileName}`);
}

function getMainRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profile:navigation')
        .setPlaceholder('Naviguer dans le profil')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Profil').setDescription('Afficher la fiche du personnage actif').setEmoji('👤').setValue('profile:home'),
          new StringSelectMenuOptionBuilder().setLabel('Inventaire').setDescription('Consulter et utiliser les objets possédés').setEmoji('🎒').setValue('profile:inventory'),
          new StringSelectMenuOptionBuilder().setLabel('Équipement').setDescription('Voir les quatre objets actuellement équipés').setEmoji('🛡️').setValue('profile:equipment'),
          new StringSelectMenuOptionBuilder().setLabel('Missions').setDescription('Ouvrir le tableau et les missions actives').setEmoji('📜').setValue('profile:missions'),
          new StringSelectMenuOptionBuilder().setLabel('Relations').setDescription('Gérer les liens entre personnages').setEmoji('🤝').setValue('profile:relations'),
          new StringSelectMenuOptionBuilder().setLabel('Rumeurs').setDescription('Consulter les rumeurs du personnage').setEmoji('🗣️').setValue('profile:rumors'),
          new StringSelectMenuOptionBuilder().setLabel('Réputation').setDescription('Voir le statut et son historique').setEmoji('⭐').setValue('profile:reputation'),
          new StringSelectMenuOptionBuilder().setLabel('Métier').setDescription('Consulter la vocation du personnage').setEmoji('🛠️').setValue('profession:home'),
          new StringSelectMenuOptionBuilder().setLabel('Atelier').setDescription('Fabriquer les objets du métier artisanal').setEmoji('⚒️').setValue('craft:home'),
        ),
    ),

    new ActionRowBuilder().addComponents(
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

      new ButtonBuilder()
        .setCustomId('profile:description')
        .setLabel('Biographie')
        .setEmoji('📝')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:image')
        .setLabel('Image')
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

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function isCharacterNameTaken(guildId, characterName, excludedProfileId = null) {
  const query = {
    guildId,
    characterName: { $regex: `^${escapeRegex(characterName)}$`, $options: 'i' },
  };
  if (excludedProfileId) query._id = { $ne: excludedProfileId };
  return Profile.exists(query);
}

async function acknowledgeProfileInteraction(interaction) {
  if (interaction.deferred || interaction.replied) {
    return true;
  }

  try {
    if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
      await interaction.deferUpdate();
      return true;
    }

    await interaction.deferReply();
    return true;
  } catch (error) {
    if (error?.code === 10062) {
      console.warn('⚠️ Interaction /profil expirée avant defer.');
      return false;
    }

    throw error;
  }
}

async function replyOrUpdate(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) {
      return await interaction.editReply(payload);
    }

    if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
      return await interaction.update(payload);
    }

    return await interaction.reply({
      ...payload,
      fetchReply: true,
    });
  } catch (error) {
    if (error?.code === 10062) {
      console.warn('⚠️ Interaction /profil expirée avant réponse Discord.');
      return null;
    }

    throw error;
  }
}

async function openProfileHub(interaction) {
  const acknowledged = await acknowledgeProfileInteraction(interaction);

  if (!acknowledged) {
    return null;
  }

  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    const rows = getNoProfileRows();

    const embed = new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle('Fairy Slayer — Aucun personnage actif')
      .setDescription(
        'Tu n’as pas encore de personnage.\nCrée ton premier profil RP pour commencer à gagner de l’XP, des Joyaux et utiliser les menus du bot.',
      );

    const message = await replyOrUpdate(interaction, {
      embeds: [embed],
      components: rows,
      files: [],
      flags: MessageFlags.Ephemeral,
    });

    scheduleProfileMenuExpiration(message, rows);
    return message;
  }

  const rows = getMainRows();
  const fileName = 'fairy-slayer-profil.png';
  const attachment = await createProfileCanvas(profile, interaction.user);

  const message = await replyOrUpdate(interaction, {
    ...createLargeCanvasPayload({
      attachment,
      components: rows,
    }),
  });

  scheduleProfileMenuExpiration(message, rows);
  return message;
}

async function showCreateModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('profile:create:modal')
    .setTitle('Créer un personnage');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('characterName')
        .setLabel('Nom du personnage')
        .setPlaceholder('Exemple : Kael Dragneel')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('age')
        .setLabel('Âge')
        .setPlaceholder('Exemple : 22 ans')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('magicType')
        .setLabel('Magie')
        .setPlaceholder('Exemple : Magie du feu stellaire')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(120),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('gender')
        .setLabel('Genre')
        .setPlaceholder('Exemple : Femme, Homme, Non-binaire...')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Titre RP')
        .setPlaceholder('Exemple : Mage errant')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(80),
    ),
  );

  return interaction.showModal(modal);
}

async function handleCreateModal(interaction) {
  const profileCount = await countProfiles(interaction.user.id, interaction.guildId);
  const profileSlots = await getProfileSlotLimit(interaction.member, interaction.guildId);

  if (profileCount >= profileSlots) {
    return interaction.reply({
      content: `Tu as déjà atteint ta limite de **${profileSlots} profil(s)**.\nDemande au staff d’augmenter tes slots si besoin.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const age = interaction.fields.getTextInputValue('age')?.trim() || 'Inconnu';
  const gender = interaction.fields.getTextInputValue('gender')?.trim() || 'Non précisé';
  const magicType = interaction.fields.getTextInputValue('magicType').trim();
  const title = interaction.fields.getTextInputValue('title')?.trim() || 'Mage errant';

  if (!characterName || !magicType) {
    return interaction.reply({ content: 'Le nom et la magie ne peuvent pas être vides.', flags: MessageFlags.Ephemeral });
  }
  if (await isCharacterNameTaken(interaction.guildId, characterName)) {
    return interaction.reply({ content: 'Un personnage porte déjà ce nom sur ce serveur.', flags: MessageFlags.Ephemeral });
  }

  const profile = await Profile.create({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    characterName,
    age,
    gender,
    magicType,
    title,
    mageRank: 'C',
    powerLevel: 100,
  });

  await getOrCreateInventory(profile._id);
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
    .setEmoji('👤')
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
    subtitle: 'Le profil actif reçoit l’XP, les Joyaux, les missions et les actions RP.',
    lines: profiles.map((profile, index) => (
      `${index + 1}. ${profile.characterName} — Rang ${profile.mageRank} · Puissance ${formatNumber(profile.powerLevel)} · Niveau ${profile.level}`
    )),
    footer: 'Utilise le menu déroulant sous le Canvas pour choisir ton personnage actif.',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: rows,
    }),
  });
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
      flags: MessageFlags.Ephemeral,
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
        .setCustomId('age')
        .setLabel('Âge')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40)
        .setValue(profile.age || ''),
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
        .setCustomId('gender')
        .setLabel('Genre')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(40)
        .setValue(profile.gender || ''),
    ),
  );

  return interaction.showModal(modal);
}

async function handleEditModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const magicType = interaction.fields.getTextInputValue('magicType').trim();
  if (!characterName || !magicType) {
    return interaction.reply({ content: 'Le nom et la magie ne peuvent pas être vides.', flags: MessageFlags.Ephemeral });
  }
  if (await isCharacterNameTaken(interaction.guildId, characterName, profile._id)) {
    return interaction.reply({ content: 'Un personnage porte déjà ce nom sur ce serveur.', flags: MessageFlags.Ephemeral });
  }

  profile.characterName = characterName;
  profile.age = interaction.fields.getTextInputValue('age')?.trim() || 'Inconnu';
  profile.magicType = magicType;
  profile.title = interaction.fields.getTextInputValue('title')?.trim() || 'Mage errant';
  profile.gender = interaction.fields.getTextInputValue('gender')?.trim() || 'Non précisé';

  await profile.save();

  return openProfileHub(interaction);
}

async function showDescriptionModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const modal = new ModalBuilder()
    .setCustomId('profile:description:modal')
    .setTitle('Modifier la biographie');

  modal.addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder()
      .setCustomId('description')
      .setLabel('Description du personnage')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(1200)
      .setValue(profile.description || ''),
  ));

  return interaction.showModal(modal);
}

async function handleDescriptionModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

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

function getInventoryCategoryLabel(category = 'all') {
  const labels = {
    all: 'Tout l’inventaire',
    consommable: 'Consommables',
    equipement: 'Équipements',
    lacrima: 'Lacrimas',
    rare: 'Objets rares',
    mission: 'Objets de mission',
    materiau: 'Matériaux de craft',
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
        .setCustomId('profile:inventory:materiau')
        .setLabel('Matériaux')
        .setEmoji('🧱')
        .setStyle(getStyle('materiau')),

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

function getInventoryItemSelectRow(items) {
  if (!items.length) return null;

  const options = items.slice(0, 25).map((item) => {
    const bonus = Number(item.powerBonus || 0);
    const bonusText = bonus > 0 ? ` - +${formatNumber(bonus)} puissance` : '';

    return new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setEmoji(item.emoji || '📦')
      .setDescription(`x${item.quantity} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)}${bonusText}`.slice(0, 100))
      .setValue(item.itemId);
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId('profile:inventory:item')
    .setPlaceholder('Voir le détail d’un objet')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

function getInventoryRowsWithSelect(items, activeCategory = 'all', page = 0, totalPages = 1) {
  const rows = [];
  const selectRow = getInventoryItemSelectRow(items);

  if (selectRow) {
    rows.push(selectRow);
  }

  const result = [
    ...rows,
    ...getInventoryCategoryRows(activeCategory),
  ];

  if (totalPages > 1) {
    result.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile:inventory:page:${activeCategory}:${Math.max(0, page - 1)}`)
        .setLabel('Précédent').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`profile:inventory:page:${activeCategory}:${Math.min(totalPages - 1, page + 1)}`)
        .setLabel('Suivant').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    ));
  }

  return result;
}

function canUseInventoryItem(item) {
  return item?.type === 'consommable';
}

function canEquipInventoryItem(item) {
  return Boolean(getItemEquipSlot(item));
}

function getItemUseText(item) {
  const effects = {
    potion_soin_mineure: 'Le personnage utilise une potion de soin mineure. L’effet peut être pris en compte dans la scène RP.',
    potion_magique: 'Le personnage utilise une potion magique. Ses réserves magiques sont symboliquement restaurées.',
  };

  return effects[item.itemId] || `Le personnage utilise ${item.name}.`;
}

function getEquipmentActionText(item, equipped) {
  if (!canEquipInventoryItem(item)) {
    return 'Action disponible : cet objet ne peut pas être équipé.';
  }

  return equipped
    ? 'Action disponible : cet objet est équipé et peut être déséquipé.'
    : 'Action disponible : cet objet peut être équipé.';
}

function getInventoryItemDetailRows(inventoryItems, item, ownedItem) {
  const rows = [];
  const selectRow = getInventoryItemSelectRow(inventoryItems);

  if (selectRow) {
    rows.push(selectRow);
  }

  const actionButtons = [];

  if (canUseInventoryItem(item)) {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId(`profile:inventory:use:${item.itemId}`)
        .setLabel('Utiliser 1')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Success),
    );
  }

  if (canEquipInventoryItem(item)) {
    actionButtons.push(
      new ButtonBuilder()
        .setCustomId(
          ownedItem?.equipped
            ? `profile:inventory:unequip:${item.itemId}`
            : `profile:inventory:equip:${item.itemId}`,
        )
        .setLabel(ownedItem?.equipped ? 'Déséquiper' : 'Équiper')
        .setEmoji(ownedItem?.equipped ? '📤' : '🛡️')
        .setStyle(ownedItem?.equipped ? ButtonStyle.Secondary : ButtonStyle.Success),
    );
  }

  actionButtons.push(
    new ButtonBuilder()
      .setCustomId('profile:inventory:all')
      .setLabel('Retour inventaire')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  );

  rows.push(new ActionRowBuilder().addComponents(actionButtons));

  return rows;
}

async function showInventory(interaction, category = 'all', requestedPage = 0) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const summary = await getInventorySummary(profile._id);
  const filteredItems = filterInventoryItems(summary.items, category);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE));
  const page = Math.max(0, Math.min(totalPages - 1, Number(requestedPage) || 0));
  const pageItems = filteredItems.slice(page * INVENTORY_PAGE_SIZE, (page + 1) * INVENTORY_PAGE_SIZE);
  const lines = formatInventoryLines(pageItems, 8);

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
    subtitle: `${formatNumber(filteredQuantity)} objet(s) - page ${page + 1}/${totalPages} - valeur : ${formatNumber(filteredValue)} Joyaux`,
    stats: [
      { label: 'Total', value: formatNumber(summary.totalQuantity) },
      { label: 'Bonus', value: `+${formatNumber(summary.equippedPowerBonus || 0)}` },
      { label: 'Équipements', value: formatNumber(countInventoryType(summary.items, 'equipement')) },
      { label: 'Lacrimas', value: formatNumber(countInventoryType(summary.items, 'lacrima')) },
    ],
    lines,
    footer: `Menu /profil - Inventaire - ${getInventoryCategoryLabel(category)}`,
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getInventoryRowsWithSelect(pageItems, category, page, totalPages),
    }),
  });
}

async function showEquipment(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return openProfileHub(interaction);

  const summary = await getInventorySummary(profile._id);
  const slots = summary.equippedSlots || {};
  const slotKeys = ['arme', 'tenue', 'accessoire', 'lacrima'];
  const lines = slotKeys.map((slot) => {
    const item = slots[slot];
    if (!item) return `${getEquipSlotLabel(slot)} : aucun objet équipé`;
    return `${item.emoji || '🛡️'} ${getEquipSlotLabel(slot)} : ${item.name} — +${formatNumber(item.powerBonus || 0)} puissance`;
  });
  const basePower = Number(profile.powerLevel || 0);
  const equipmentBonus = Number(summary.equippedPowerBonus || 0);

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-equipement.png',
    variant: 'inventory',
    section: `Équipement — ${profile.characterName}`,
    title: 'Équipement actif',
    subtitle: 'Les bonus des quatre slots sont ajoutés à la puissance du personnage.',
    stats: [
      { label: 'Puissance de base', value: formatNumber(basePower) },
      { label: 'Bonus équipement', value: `+${formatNumber(equipmentBonus)}` },
      { label: 'Puissance totale', value: formatNumber(basePower + equipmentBonus) },
      { label: 'Slots occupés', value: `${Object.values(slots).filter(Boolean).length}/4` },
    ],
    lines,
    footer: 'Ouvre l’inventaire Équipements pour équiper ou déséquiper un objet.',
  });

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('profile:inventory:equipement')
        .setLabel('Gérer les équipements')
        .setEmoji('🎒')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour au profil')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];

  return interaction.update(createLargeCanvasPayload({ attachment, components: rows }));
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

  const powerBonus = getItemPowerBonus(item);
  const equipSlot = getItemEquipSlot(item);
  const equipSlotLabel = getEquipSlotLabel(equipSlot);
  const fileName = 'fairy-slayer-objet.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Objet — ${profile.characterName}`,
    title: `${item.emoji || '📦'} ${item.name}`,
    subtitle: item.description,
    stats: [
      { label: 'Quantité', value: formatNumber(ownedItem.quantity) },
      { label: 'Slot', value: equipSlotLabel },
      { label: 'Bonus', value: powerBonus > 0 ? `+${formatNumber(powerBonus)}` : 'Aucun' },
      { label: 'Statut', value: ownedItem.equipped ? 'Équipé' : 'Non équipé' },
    ],
    lines: [
      `Nom : ${item.name}`,
      `Description : ${item.description}`,
      `Type : ${getTypeLabel(item.type)}`,
      `Rareté : ${getRarityLabel(item.rarity)}`,
      `Slot : ${equipSlotLabel}`,
      `Bonus de puissance : ${powerBonus > 0 ? `+${formatNumber(powerBonus)}` : 'Aucun'}`,
      `Prix boutique : ${formatNumber(item.basePrice)} Joyaux`,
      `Prix de revente : ${formatNumber(item.sellPrice)} Joyaux`,
      `Rang requis : ${item.requiredRank || 'C'}`,
      `Puissance requise : ${formatNumber(item.requiredPower || 0)}`,
      canUseInventoryItem(item)
        ? 'Action disponible : cet objet peut être utilisé.'
        : getEquipmentActionText(item, ownedItem.equipped),
    ],
    footer: 'Menu /profil - Fiche détail d’objet',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getInventoryItemDetailRows(inventoryItems, item, ownedItem),
    }),
  });
}

async function useInventoryItem(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const itemId = interaction.customId.replace('profile:inventory:use:', '');
  const item = getItemById(itemId);

  if (!item) {
    return interaction.reply({
      content: 'Objet introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!canUseInventoryItem(item)) {
    return interaction.reply({
      content: `**${item.name}** ne peut pas être utilisé pour le moment.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const removed = await removeItemFromInventory(profile._id, item.itemId, 1);

  if (!removed) {
    return interaction.reply({
      content: `Tu ne possèdes pas **${item.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const remainingItem = inventoryItems.find((entry) => entry.itemId === item.itemId);
  const remainingQuantity = remainingItem?.quantity || 0;
  const fileName = 'fairy-slayer-objet-utilise.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Objet utilisé — ${profile.characterName}`,
    title: `${item.emoji || '🧪'} ${item.name}`,
    subtitle: 'L’objet a été consommé avec succès.',
    stats: [
      { label: 'Utilisé', value: '1' },
      { label: 'Restant', value: formatNumber(remainingQuantity) },
      { label: 'Type', value: getTypeLabel(item.type) },
      { label: 'Rareté', value: getRarityLabel(item.rarity) },
    ],
    lines: [
      `Objet utilisé : ${item.name}`,
      'Quantité consommée : 1',
      `Quantité restante : ${formatNumber(remainingQuantity)}`,
      `Effet : ${getItemUseText(item)}`,
    ],
    footer: 'Menu /profil - Utilisation de consommable',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getInventoryRowsWithSelect(inventoryItems, 'all'),
    }),
  });
}

async function equipInventoryItemAction(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const itemId = interaction.customId.replace('profile:inventory:equip:', '');
  const result = await equipItemInInventory(profile._id, itemId);

  if (!result.success) {
    return interaction.reply({
      content: result.reason,
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const ownedItem = inventoryItems.find((entry) => entry.itemId === result.item.itemId);
  const powerBonus = Number(result.powerBonus || result.item.powerBonus || 0);
  const fileName = 'fairy-slayer-objet-equipe.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Objet équipé — ${profile.characterName}`,
    title: `${result.item.emoji || '⚔️'} ${result.item.name}`,
    subtitle: 'L’objet a été équipé avec succès.',
    stats: [
      { label: 'Statut', value: 'Équipé' },
      { label: 'Slot', value: result.slotLabel || 'Équipement' },
      { label: 'Bonus', value: powerBonus > 0 ? `+${formatNumber(powerBonus)}` : 'Aucun' },
      { label: 'Quantité', value: formatNumber(ownedItem?.quantity || 1) },
    ],
    lines: [
      `Objet équipé : ${result.item.name}`,
      `Slot : ${result.slotLabel || 'Équipement'}`,
      `Type : ${getTypeLabel(result.item.type)}`,
      `Rareté : ${getRarityLabel(result.item.rarity)}`,
      `Bonus de puissance : ${powerBonus > 0 ? `+${formatNumber(powerBonus)}` : 'Aucun'}`,
      `Un autre objet du slot ${result.slotLabel || 'correspondant'} a été automatiquement déséquipé.`,
    ],
    footer: 'Menu /profil - Équipement modifié',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getInventoryItemDetailRows(inventoryItems, result.item, ownedItem),
    }),
  });
}

async function unequipInventoryItemAction(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const itemId = interaction.customId.replace('profile:inventory:unequip:', '');
  const result = await unequipItemInInventory(profile._id, itemId);

  if (!result.success) {
    return interaction.reply({
      content: result.reason,
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const ownedItem = inventoryItems.find((entry) => entry.itemId === result.item.itemId);
  const powerBonus = Number(result.powerBonus || result.item.powerBonus || 0);
  const fileName = 'fairy-slayer-objet-desequipe.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'inventory',
    section: `Objet déséquipé — ${profile.characterName}`,
    title: `${result.item.emoji || '🛡️'} ${result.item.name}`,
    subtitle: 'L’objet a été déséquipé avec succès.',
    stats: [
      { label: 'Statut', value: 'Non équipé' },
      { label: 'Slot', value: result.slotLabel || 'Équipement' },
      { label: 'Bonus retiré', value: powerBonus > 0 ? `-${formatNumber(powerBonus)}` : 'Aucun' },
      { label: 'Quantité', value: formatNumber(ownedItem?.quantity || 1) },
    ],
    lines: [
      `Objet déséquipé : ${result.item.name}`,
      `Slot : ${result.slotLabel || 'Équipement'}`,
      `Type : ${getTypeLabel(result.item.type)}`,
      `Rareté : ${getRarityLabel(result.item.rarity)}`,
      `Bonus de puissance retiré : ${powerBonus > 0 ? `-${formatNumber(powerBonus)}` : 'Aucun'}`,
      'L’objet reste dans ton inventaire.',
    ],
    footer: 'Menu /profil - Équipement modifié',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getInventoryItemDetailRows(inventoryItems, result.item, ownedItem),
    }),
  });
}

async function showMissions(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const missions = await ProfileMission.find({ profileId: profile._id })
    .sort({ updatedAt: -1 })
    .limit(8);

  const lines = missions.length
    ? missions.map((mission) => (
      `${mission.missionId} — ${mission.status}`
    ))
    : ['Aucune mission active ou terminée pour ce personnage.'];

  const fileName = 'fairy-slayer-missions.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: `Missions — ${profile.characterName}`,
    title: `${missions.length} mission(s) affichée(s)`,
    subtitle: 'Les missions avancées arriveront dans une prochaine étape.',
    stats: [
      { label: 'Niveau', value: formatNumber(profile.level) },
      { label: 'XP', value: formatNumber(profile.xp) },
      { label: 'Rang', value: profile.mageRank },
      { label: 'Joyaux', value: formatNumber(profile.jewels) },
    ],
    lines,
    footer: 'Menu /profil - Missions',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getMainRows(),
    }),
  });
}

async function showRelations(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const relations = await Relation.find({ ownerProfileId: profile._id })
    .sort({ updatedAt: -1 })
    .limit(8);

  const targetIds = relations.map((relation) => relation.targetProfileId).filter(Boolean);
  const targets = await Profile.find({ _id: { $in: targetIds } });
  const targetById = new Map(targets.map((target) => [String(target._id), target]));

  const lines = relations.length
    ? relations.map((relation) => {
      const target = targetById.get(String(relation.targetProfileId));
      return `${target?.characterName || 'Personnage inconnu'} — ${relation.type} · confiance ${relation.trust} · tension ${relation.tension}`;
    })
    : ['Aucune relation enregistrée pour ce personnage.'];

  const fileName = 'fairy-slayer-relations.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'relations',
    section: `Relations — ${profile.characterName}`,
    title: `${relations.length} relation(s) affichée(s)`,
    subtitle: 'Relations du personnage actif.',
    lines,
    footer: 'Menu /profil - Relations',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getMainRows(),
    }),
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
      `${rumor.type.toUpperCase()} — ${rumor.content} · crédibilité ${rumor.credibility}%`
    ))
    : ['Aucune rumeur active sur ce personnage.'];

  const fileName = 'fairy-slayer-rumeurs.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'rumors',
    section: `Rumeurs — ${profile.characterName}`,
    title: `${rumors.length} rumeur(s) active(s)`,
    subtitle: 'Les rumeurs peuvent influencer réputation et boutique.',
    lines,
    footer: 'Menu /profil - Rumeurs',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getMainRows(),
    }),
  });
}

async function showReputation(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return openProfileHub(interaction);
  }

  const logs = await ReputationLog.find({ profileId: profile._id })
    .sort({ createdAt: -1 })
    .limit(8);

  const lines = logs.length
    ? logs.map((log) => (
      `${log.amount > 0 ? '+' : ''}${log.amount} — ${log.reason}`
    ))
    : ['Aucun historique de réputation pour ce personnage.'];

  const fileName = 'fairy-slayer-reputation.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'reputation',
    section: `Réputation — ${profile.characterName}`,
    title: `${profile.reputation} · ${getReputationLabel(profile.reputation)}`,
    subtitle: 'La réputation influence le regard du monde et certains prix.',
    stats: [
      { label: 'Réputation', value: String(profile.reputation) },
      { label: 'Statut', value: getReputationLabel(profile.reputation) },
      { label: 'Historique', value: formatNumber(logs.length) },
      { label: 'Rang', value: profile.mageRank },
    ],
    lines,
    footer: 'Menu /profil - Réputation',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getMainRows(),
    }),
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
  showDescriptionModal,
  handleDescriptionModal,
  showImageModal,
  handleImageModal,
  showInventory,
  showEquipment,
  showInventoryItem,
  useInventoryItem,
  equipInventoryItemAction,
  unequipInventoryItemAction,
  showMissions,
  showRelations,
  showRumors,
  showReputation,
};
