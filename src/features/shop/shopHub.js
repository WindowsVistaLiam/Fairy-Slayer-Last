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

const {
  addItemToInventory,
  removeItemFromInventory,
  getInventoryDetails,
} = require('../../utils/inventoryUtils');

const {
  getShopItems,
  getItemById,
  getRarityLabel,
  getTypeLabel,
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

function canBuyItem(profile, item) {
  const profileRank = getRankPower(profile.mageRank);
  const requiredRank = getRankPower(item.requiredRank || 'C');

  if (profileRank < requiredRank) {
    return {
      allowed: false,
      reason: `rang ${item.requiredRank} requis`,
    };
  }

  if (Number(profile.powerLevel || 0) < Number(item.requiredPower || 0)) {
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

function getBuyRows(items, profile, rumors) {
  const options = items.slice(0, 25).map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item);

    return new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setDescription(`${formatNumber(finalPrice)} Jewels - ${availability.reason}`.slice(0, 100))
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
    const options = inventoryItems.slice(0, 25).map((item) => new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setDescription(`x${item.quantity} - revente ${formatNumber(item.sellPrice)} Jewels`.slice(0, 100))
      .setValue(item.itemId));

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

  let items = getShopItems();

  if (filterType) {
    items = items.filter((item) => item.type === filterType);
  }

  const lines = items.slice(0, 8).map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item);
    const status = availability.allowed ? 'Disponible' : `Bloqué : ${availability.reason}`;

    return `${item.name} - ${formatNumber(finalPrice)} Jewels - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)} - ${status}`;
  });

  const fileName = 'fairy-slayer-boutique.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'shop',
    section: `Boutique — ${profile.characterName}`,
    title: filterType ? `Rayon ${getTypeLabel(filterType)}` : 'Boutique de Magnolia',
    subtitle: 'Les prix évoluent selon ta réputation et les rumeurs actives.',
    stats: [
      { label: 'Jewels', value: formatNumber(profile.jewels) },
      { label: 'Réputation', value: String(profile.reputation || 0) },
      { label: 'Rang', value: profile.mageRank },
      { label: 'Puissance', value: formatNumber(profile.powerLevel) },
    ],
    lines,
    footer: 'Sélectionne un objet dans le menu sous le Canvas pour l’acheter.',
  });

  const payload = {
    embeds: [createCanvasEmbed(fileName)],
    components: getBuyRows(items, profile, rumors),
    files: [attachment],
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

  const totalSellValue = inventoryItems.reduce(
    (total, item) => total + Number(item.sellPrice || 0) * Number(item.quantity || 0),
    0,
  );

  const lines = inventoryItems.length
    ? inventoryItems.slice(0, 8).map((item) => (
      `${item.name} x${item.quantity} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)} - revente ${formatNumber(item.sellPrice)} Jewels`
    ))
    : [
      'Ton inventaire est vide. Achète des objets dans la boutique ou demande au staff de t’en donner.',
    ];

  const fileName = 'fairy-slayer-vente.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'shop',
    section: `Vente — ${profile.characterName}`,
    title: 'Revendre un objet',
    subtitle: `Valeur totale de revente : ${formatNumber(totalSellValue)} Jewels`,
    stats: [
      { label: 'Jewels', value: formatNumber(profile.jewels) },
      { label: 'Objets', value: formatNumber(inventoryItems.reduce((total, item) => total + item.quantity, 0)) },
      { label: 'Valeur', value: formatNumber(totalSellValue) },
      { label: 'Rang', value: profile.mageRank },
    ],
    lines,
    footer: 'Sélectionne un objet dans le menu sous le Canvas pour en vendre 1 exemplaire.',
  });

  return interaction.update({
    embeds: [createCanvasEmbed(fileName)],
    components: getSellRows(inventoryItems),
    files: [attachment],
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

  const availability = canBuyItem(profile, item);

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
      content: `Tu n’as pas assez de Jewels. Prix : **${formatNumber(finalPrice)} Jewels**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  profile.jewels -= finalPrice;

  await profile.save();
  await addItemToInventory(profile._id, item.itemId, 1);

  return interaction.reply({
    content: `Achat réussi : **${item.name}** pour **${formatNumber(finalPrice)} Jewels**.`,
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
    content: `Vente réussie : **${item.name}** vendu pour **${formatNumber(sellPrice)} Jewels**.`,
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