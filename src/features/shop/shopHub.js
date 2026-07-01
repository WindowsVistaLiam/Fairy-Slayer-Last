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
const { addItemToInventory } = require('../../utils/inventoryUtils');
const { getShopItems, getItemById, getRarityLabel, getTypeLabel } = require('../../data/items');

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

function getShopRows(items, profile, rumors) {
  const options = items.slice(0, 25).map((item) => {
    const finalPrice = calculateShopPrice(item.basePrice, profile, rumors);
    const availability = canBuyItem(profile, item);

    return new StringSelectMenuOptionBuilder()
      .setLabel(item.name.slice(0, 100))
      .setDescription(`${formatNumber(finalPrice)} Jewels - ${availability.reason}`.slice(0, 100))
      .setValue(item.itemId);
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId('shop:buy')
    .setPlaceholder('Choisir un objet à acheter')
    .addOptions(options);

  return [
    new ActionRowBuilder().addComponents(select),

    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('shop:refresh')
        .setLabel('Actualiser')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Secondary),

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
    ),
  ];
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
    components: getShopRows(items, profile, rumors),
    files: [attachment],
  };

  if (interaction.isButton() || interaction.isStringSelectMenu()) {
    return interaction.update(payload);
  }

  return interaction.reply(payload);
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

  await interaction.reply({
    content: `Achat réussi : **${item.name}** pour **${formatNumber(finalPrice)} Jewels**.`,
    flags: MessageFlags.Ephemeral,
  });

  return null;
}

async function handleShopComponent(interaction) {
  const id = interaction.customId;

  if (id === 'shop:buy') return buyItem(interaction);
  if (id === 'shop:refresh') return renderShop(interaction);
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