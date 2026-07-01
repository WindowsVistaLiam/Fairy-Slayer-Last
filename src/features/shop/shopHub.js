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

  return Math.max(1, Math.floor(basePrice * multiplier));
}

function formatShopItemLine(item, finalPrice, availability) {
  const slot = getItemEquipSlot(item);
  const slotText = slot ? ` - ${getEquipSlotLabel(slot)}` : '';
  const powerBonus = getItemPowerBonus(item);
  const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';
  const status = availability.allowed ? 'Disponible' : `Bloqué : ${availability.reason}`;

  return `${item.name} - ${formatNumber(finalPrice)} Joyaux - ${getTypeLabel(item.type)}${slotText} - ${getRarityLabel(item.rarity)}${bonusText} - ${status}`;
}

function getBuyRows(items, profile, rumors, powerInfo) {
  const options = items.slice(0, 25).map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item, powerInfo);
    const powerBonus = getItemPowerBonus(item);
    const bonusText = powerBonus > 0 ? ` +${formatNumber(powerBonus)} puissance` : '';

    return new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
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

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop:refresh')
        .setLabel('Tout')
        .setEmoji('🏪')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('shop:consommable')
        .setLabel('Consommables')
        .setEmoji('🧪')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('shop:equipement')
        .setLabel('Équipements')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('shop:lacrima')
        .setLabel('Lacrimas')
        .setEmoji('💠')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('shop:sell-menu')
        .setLabel('Vendre')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success),
    ),
  );

  return rows;
}

function getSellRows(inventoryItems) {
  const rows = [];

  if (inventoryItems.length) {
    const options = inventoryItems.slice(0, 25).map((item) => {
      const powerBonus = getItemPowerBonus(item);
      const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';

      return new StringSelectMenuOptionBuilder()
        .setLabel(item.name.slice(0, 100))
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
    ),
  );

  return rows;
}

async function renderShop(interaction, filterType = null) {
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

  const lines = items.slice(0, 8).map((item) => {
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
    subtitle: 'Les prix évoluent selon ta réputation, les rumeurs et tes conditions de puissance.',
    stats: [
      { label: 'Joyaux', value: formatNumber(profile.jewels) },
      { label: 'Puissance', value: formatNumber(powerInfo.totalPower) },
      { label: 'Bonus équip.', value: `+${formatNumber(powerInfo.equipmentBonus)}` },
      { label: 'Rang', value: profile.mageRank },
    ],
    lines,
    footer: 'Sélectionne un objet dans le menu sous le Canvas pour l’acheter.',
  });

  const payload = {
    ...createLargeCanvasPayload({
      attachment,
      components: getBuyRows(items, profile, rumors, powerInfo),
    }),
  };

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return interaction.update(payload);
  }

  return interaction.reply(payload);
}

async function renderSellMenu(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventoryItems = await getInventoryDetails(profile._id);
  const powerInfo = await getProfileShopPower(profile);

  const totalSellValue = inventoryItems.reduce(
    (total, item) => total + Number(item.sellPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const lines = inventoryItems.length
    ? inventoryItems.slice(0, 8).map((item) => {
      const slot = getItemEquipSlot(item);
      const slotText = slot ? ` - ${getEquipSlotLabel(slot)}` : '';
      const powerBonus = getItemPowerBonus(item);
      const bonusText = powerBonus > 0 ? ` - +${formatNumber(powerBonus)} puissance` : '';
      const equippedText = item.equipped ? ' - ÉQUIPÉ' : '';

      return `${item.name} x${item.quantity} - ${getTypeLabel(item.type)}${slotText} - ${getRarityLabel(item.rarity)}${bonusText} - revente ${formatNumber(item.sellPrice)} Joyaux${equippedText}`;
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
    subtitle: `Valeur totale de revente : ${formatNumber(totalSellValue)} Joyaux`,
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
      components: getSellRows(inventoryItems),
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

  if (id === 'shop:consommable') return renderShop(interaction, 'consommable');
  if (id === 'shop:equipement') return renderShop(interaction, 'equipement');
  if (id === 'shop:lacrima') return renderShop(interaction, 'lacrima');

  return interaction.reply({
    content: 'Action boutique inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  openShopHub,
  handleShopComponent,
};
