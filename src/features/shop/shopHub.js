const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');

const Rumor = require('../../models/Rumor');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getActiveProfile } = require('../../utils/activeProfile');
const { formatNumber } = require('../../utils/format');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { applyMerchantDiscount, getProfessionLabel } = require('../../utils/professions');

const SHOP_PAGE_SIZE = 25;

const {
  addItemToInventory,
  removeItemFromInventory,
  getInventoryDetails,
  getProfilePowerWithEquipment,
} = require('../../utils/inventoryUtils');

const {
  getShopItems,
  getItemById,
  getRarityLabel,
  getTypeLabel,
  getEquipSlotLabel,
  getItemEquipSlot,
  getItemPowerBonus,
} = require('../../data/items');

function createCanvasEmbed(fileName, color = 0x9b8cff) {
  return new EmbedBuilder()
    .setColor(color)
    .setImage(`attachment://${fileName}`);
}

function getRankPower(rank) {
  const values = {
    C: 1,
    B: 2,
    A: 3,
    S: 4,
    Sacré: 5,
  };

  return values[rank] || 1;
}

async function getProfileShopPower(profile) {
  const powerInfo = await getProfilePowerWithEquipment(profile);

  return {
    basePower: Number(powerInfo.basePower || profile.powerLevel || 0),
    equipmentBonus: Number(powerInfo.equipmentBonus || 0),
    totalPower: Number(powerInfo.totalPower || profile.powerLevel || 0),
  };
}

function canBuyItem(profile, item, powerInfo) {
  const profileRank = getRankPower(profile.mageRank);
  const requiredRank = getRankPower(item.requiredRank || 'C');
  const totalPower = Number(powerInfo?.totalPower || profile.powerLevel || 0);

  if (profileRank < requiredRank) {
    return {
      allowed: false,
      reason: `rang ${item.requiredRank} requis`,
    };
  }

  if (totalPower < Number(item.requiredPower || 0)) {
    return {
      allowed: false,
      reason: `${formatNumber(item.requiredPower)} puissance requise`,
    };
  }

  return {
    allowed: true,
    reason: 'achetable',
  };
}

async function getActiveRumors(profileId) {
  const now = new Date();

  return Rumor.find({
    targetProfileId: profileId,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } },
    ],
  }).limit(20);
}

function calculateShopPrice(basePrice, profile, rumors = []) {
  let multiplier = 1;

  const reputation = Number(profile.reputation || 0);

  if (reputation >= 75) multiplier -= 0.20;
  else if (reputation >= 40) multiplier -= 0.12;
  else if (reputation >= 10) multiplier -= 0.05;

  if (reputation <= -75) multiplier += 0.30;
  else if (reputation <= -40) multiplier += 0.18;
  else if (reputation <= -10) multiplier += 0.08;

  for (const rumor of rumors) {
    if (rumor.type === 'negative') {
      multiplier += Number(rumor.impactShopPrice || 0);
    }

    if (rumor.type === 'positive') {
      multiplier -= Number(rumor.impactShopPrice || 0);
    }
  }

  const adjustedPrice = Math.max(1, Math.floor(basePrice * multiplier));
  return applyMerchantDiscount(adjustedPrice, profile.profession);
}

function formatShopItemLine(item, finalPrice, availability) {
  const slot = getItemEquipSlot(item);
  const slotText = slot ? ` - ${getEquipSlotLabel(slot)}` : '';
  const powerBonus = getItemPowerBonus(item);
  const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';
  const status = availability.allowed ? 'Disponible' : `Bloqué : ${availability.reason}`;

  return `${item.emoji || '📦'} ${item.name} - ${formatNumber(finalPrice)} Joyaux - ${getTypeLabel(item.type)}${slotText} - ${getRarityLabel(item.rarity)}${bonusText} - ${status}`;
}

function getBuyRows(items, profile, rumors, powerInfo, filterType, page, totalPages) {
  const options = items.map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item, powerInfo);
    const powerBonus = getItemPowerBonus(item);
    const bonusText = powerBonus > 0 ? ` +${formatNumber(powerBonus)} puissance` : '';

    return new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setEmoji(item.emoji || '📦')
      .setDescription(`${formatNumber(finalPrice)} Joyaux - ${availability.reason}${bonusText}`.slice(0, 100))
      .setValue(item.itemId);
  });

  const rows = [];

  if (options.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId('shop:buy')
      .setPlaceholder('Choisir un objet à acheter')
      .addOptions(options);

    rows.push(new ActionRowBuilder().addComponents(select));
  }

  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop:view:all:0').setLabel('Tout').setEmoji('🏪').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('shop:view:consommable:0').setLabel('Consommables').setEmoji('🧪').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop:view:equipement:0').setLabel('Équipements').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop:view:lacrima:0').setLabel('Lacrimas').setEmoji('💠').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop:view:materiau:0').setLabel('Matériaux').setEmoji('🧱').setStyle(ButtonStyle.Secondary),
  ));

  const filterKey = filterType || 'all';
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop:view:${filterKey}:${Math.max(0, page - 1)}:previous`)
      .setLabel('Précédent').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`shop:view:${filterKey}:${Math.min(totalPages - 1, page + 1)}:next`)
      .setLabel('Suivant').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    new ButtonBuilder().setCustomId('shop:sell-menu').setLabel('Vendre').setEmoji('💰').setStyle(ButtonStyle.Success),
  ));

  return rows;
}

function getSellRows(inventoryItems, page = 0, totalPages = 1) {
  const rows = [];

  if (inventoryItems.length) {
    const options = inventoryItems.map((item) => {
      const powerBonus = getItemPowerBonus(item);
      const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';

      return new StringSelectMenuOptionBuilder()
        .setLabel(item.name.slice(0, 100))
        .setEmoji(item.emoji || '📦')
        .setDescription(`x${item.quantity} - revente ${formatNumber(item.sellPrice)} Joyaux${bonusText}`.slice(0, 100))
        .setValue(item.itemId);
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId('shop:sell')
      .setPlaceholder('Choisir un objet à vendre')
      .addOptions(options);

    rows.push(new ActionRowBuilder().addComponents(select));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop:back')
        .setLabel('Retour boutique')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`shop:sell-page:${Math.max(0, page - 1)}:previous`)
        .setLabel('Précédent').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`shop:sell-page:${Math.min(totalPages - 1, page + 1)}:next`)
        .setLabel('Suivant').setEmoji('➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1),
    ),
  );

  return rows;
}

async function renderShop(interaction, filterType = null, requestedPage = 0) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const rumors = await getActiveRumors(profile._id);
  const powerInfo = await getProfileShopPower(profile);

  let items = getShopItems();

  if (filterType) {
    items = items.filter((item) => item.type === filterType);
  }

  const totalPages = Math.max(1, Math.ceil(items.length / SHOP_PAGE_SIZE));
  const page = Math.max(0, Math.min(totalPages - 1, Number(requestedPage) || 0));
  const pageItems = items.slice(page * SHOP_PAGE_SIZE, (page + 1) * SHOP_PAGE_SIZE);

  const lines = pageItems.slice(0, 8).map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item, powerInfo);

    return formatShopItemLine(item, finalPrice, availability);
  });

  const fileName = 'fairy-slayer-boutique.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'shop',
    section: `Boutique — ${profile.characterName}`,
    title: filterType ? `Rayon ${getTypeLabel(filterType)}` : 'Boutique de Magnolia',
    subtitle: `Page ${page + 1}/${totalPages} - Prix selon réputation, rumeurs et métier.`,
    stats: [
      { label: 'Joyaux', value: formatNumber(profile.jewels) },
      { label: 'Puissance', value: formatNumber(powerInfo.totalPower) },
      { label: 'Bonus équip.', value: `+${formatNumber(powerInfo.equipmentBonus)}` },
      { label: 'Métier', value: profile.profession === 'marchand' ? 'Marchand -20 %' : getProfessionLabel(profile.profession) },
    ],
    lines,
    footer: 'Sélectionne un objet dans le menu sous le Canvas pour l’acheter.',
  });

  const payload = {
    ...createLargeCanvasPayload({
      attachment,
      components: getBuyRows(pageItems, profile, rumors, powerInfo, filterType, page, totalPages),
    }),
  };

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return interaction.update(payload);
  }

  return interaction.reply(payload);
}

async function renderSellMenu(interaction, requestedPage = 0) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const powerInfo = await getProfileShopPower(profile);
  const totalPages = Math.max(1, Math.ceil(inventoryItems.length / SHOP_PAGE_SIZE));
  const page = Math.max(0, Math.min(totalPages - 1, Number(requestedPage) || 0));
  const pageItems = inventoryItems.slice(page * SHOP_PAGE_SIZE, (page + 1) * SHOP_PAGE_SIZE);

  const totalSellValue = inventoryItems.reduce(
    (total, item) => total + Number(item.sellPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const lines = pageItems.length
    ? pageItems.slice(0, 8).map((item) => {
      const slot = getItemEquipSlot(item);
      const slotText = slot ? ` - ${getEquipSlotLabel(slot)}` : '';
      const powerBonus = getItemPowerBonus(item);
      const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';
      const equippedText = item.equipped ? ' - ÉQUIPÉ' : '';

      return `${item.emoji || '📦'} ${item.name} x${item.quantity} - ${getTypeLabel(item.type)}${slotText} - ${getRarityLabel(item.rarity)}${bonusText} - revente ${formatNumber(item.sellPrice)} Joyaux${equippedText}`;
    })
    : [
      'Ton inventaire est vide. Achète des objets dans la boutique ou demande au staff de t’en donner.',
    ];

  const fileName = 'fairy-slayer-vente.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'shop',
    section: `Vente — ${profile.characterName}`,
    title: 'Revendre un objet',
    subtitle: `Page ${page + 1}/${totalPages} - valeur totale : ${formatNumber(totalSellValue)} Joyaux`,
    stats: [
      { label: 'Joyaux', value: formatNumber(profile.jewels) },
      { label: 'Objets', value: formatNumber(inventoryItems.reduce((total, item) => total + item.quantity, 0)) },
      { label: 'Bonus équip.', value: `+${formatNumber(powerInfo.equipmentBonus)}` },
      { label: 'Valeur', value: formatNumber(totalSellValue) },
    ],
    lines,
    footer: 'Sélectionne un objet dans le menu sous le Canvas pour en vendre 1 exemplaire.',
  });

  return interaction.update({
    ...createLargeCanvasPayload({
      attachment,
      components: getSellRows(pageItems, page, totalPages),
    }),
  });
}

async function openShopHub(interaction) {
  return renderShop(interaction);
}

async function buyItem(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const itemId = interaction.values[0];
  const item = getItemById(itemId);

  if (!item || !item.availableInShop) {
    return interaction.reply({
      content: 'Cet objet est introuvable dans la boutique.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const powerInfo = await getProfileShopPower(profile);
  const availability = canBuyItem(profile, item, powerInfo);

  if (!availability.allowed) {
    return interaction.reply({
      content: `Tu ne peux pas acheter **${item.name}** : ${availability.reason}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const rumors = await getActiveRumors(profile._id);
  const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);

  if (Number(profile.jewels || 0) < finalPrice) {
    return interaction.reply({
      content: `Tu n’as pas assez de Joyaux. Prix : **${formatNumber(finalPrice)} Joyaux**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  profile.jewels -= finalPrice;

  await profile.save();
  await addItemToInventory(profile._id, item.itemId, 1);

  const powerBonus = getItemPowerBonus(item);
  const bonusText = powerBonus > 0 ? ` Il donne **+${formatNumber(powerBonus)} puissance** une fois équipé.` : '';

  return interaction.reply({
    content: `Achat réussi : **${item.name}** pour **${formatNumber(finalPrice)} Joyaux**.${bonusText}`,
    flags: MessageFlags.Ephemeral,
  });
}

async function sellItem(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const itemId = interaction.values[0];
  const item = getItemById(itemId);

  if (!item) {
    return interaction.reply({
      content: 'Cet objet est introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const ownedItem = inventoryItems.find((entry) => entry.itemId === item.itemId);

  if (ownedItem?.equipped) {
    return interaction.reply({
      content: `Tu dois d’abord déséquiper **${item.name}** avant de le vendre.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const removed = await removeItemFromInventory(profile._id, itemId, 1);

  if (!removed) {
    return interaction.reply({
      content: `Tu ne possèdes pas **${item.name}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const sellPrice = Number(item.sellPrice || 0);

  profile.jewels += sellPrice;

  await profile.save();

  return interaction.reply({
    content: `Vente réussie : **${item.name}** vendu pour **${formatNumber(sellPrice)} Joyaux**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleShopComponent(interaction) {
  const id = interaction.customId;

  if (id === 'shop:buy') return buyItem(interaction);
  if (id === 'shop:sell') return sellItem(interaction);

  if (id === 'shop:refresh') return renderShop(interaction);
  if (id === 'shop:back') return renderShop(interaction);

  if (id === 'shop:sell-menu') return renderSellMenu(interaction);
  if (id.startsWith('shop:sell-page:')) {
    const [, , rawPage] = id.split(':');
    return renderSellMenu(interaction, Number.parseInt(rawPage, 10) || 0);
  }

  if (id === 'shop:consommable') return renderShop(interaction, 'consommable');
  if (id === 'shop:equipement') return renderShop(interaction, 'equipement');
  if (id === 'shop:lacrima') return renderShop(interaction, 'lacrima');
  if (id.startsWith('shop:view:')) {
    const [, , rawFilter, rawPage] = id.split(':');
    return renderShop(interaction, rawFilter === 'all' ? null : rawFilter, Number.parseInt(rawPage, 10) || 0);
  }

  return interaction.reply({
    content: 'Action boutique inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openShopHub,
  handleShopComponent,
};
