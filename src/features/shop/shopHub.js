const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const Item = require('../../models/Item');
const Rumor = require('../../models/Rumor');
const { getActiveProfile } = require('../../utils/activeProfile');
const { calculateFinalPrice } = require('../../utils/prices');
const { canAccessRank } = require('../../utils/ranks');
const { formatNumber } = require('../../utils/format');

const DEFAULT_ITEMS = [
  {
    itemId: 'potion_magique_mineure',
    name: 'Potion magique mineure',
    description: 'Restaure légèrement l’énergie magique pendant une scène RP.',
    type: 'consommable',
    rarity: 'common',
    basePrice: 250,
    sellPrice: 75,
    requiredMageRank: 'C',
    requiredPowerLevel: 0,
  },
  {
    itemId: 'lacrima_feu_mineure',
    name: 'Lacrima de feu mineure',
    description: 'Une petite lacrima utile aux mages liés au feu.',
    type: 'lacrima',
    rarity: 'rare',
    basePrice: 1200,
    sellPrice: 300,
    requiredMageRank: 'B',
    requiredPowerLevel: 500,
  },
  {
    itemId: 'cape_mage_noir',
    name: 'Cape du mage noir',
    description: 'Un équipement sombre qui impose le respect en mission.',
    type: 'equipement',
    rarity: 'epic',
    basePrice: 2800,
    sellPrice: 700,
    requiredMageRank: 'A',
    requiredPowerLevel: 1500,
  },
  {
    itemId: 'relique_sacree_dragon',
    name: 'Relique sacrée du dragon',
    description: 'Un artefact réservé aux mages les plus exceptionnels.',
    type: 'rare',
    rarity: 'sacred',
    basePrice: 15000,
    sellPrice: 3000,
    requiredMageRank: 'Sacré',
    requiredPowerLevel: 6000,
  },
];

async function seedDefaultItems() {
  for (const item of DEFAULT_ITEMS) {
    await Item.findOneAndUpdate(
      { itemId: item.itemId },
      { $setOnInsert: item },
      { upsert: true, new: true },
    );
  }
}

function getShopRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop:all').setLabel('Tout').setEmoji('🛒').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('shop:consommable').setLabel('Consommables').setEmoji('🧪').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop:lacrima').setLabel('Lacrimas').setEmoji('💠').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop:equipement').setLabel('Équipements').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop:rare').setLabel('Rares').setEmoji('✨').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop:sell').setLabel('Vendre').setEmoji('💰').setStyle(ButtonStyle.Success).setDisabled(true),
    ),
  ];
}

async function buildShopEmbed(interaction, category = 'all') {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return {
      embeds: [new EmbedBuilder()
        .setColor(0xff6666)
        .setTitle('Boutique indisponible')
        .setDescription('Tu dois d’abord créer ou sélectionner un personnage avec `/profil`.')],
      components: [],
      ephemeral: true,
    };
  }

  await seedDefaultItems();

  const query = { availableInShop: true };
  if (category !== 'all') query.type = category;

  const items = await Item.find(query).sort({ basePrice: 1 }).limit(10);
  const now = new Date();
  const rumors = await Rumor.find({
    targetProfileId: profile._id,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  });

  const lines = items.map((item) => {
    const finalPrice = calculateFinalPrice(item.basePrice, profile, rumors);
    const allowed = canAccessRank(profile.mageRank, item.requiredMageRank) && profile.powerLevel >= item.requiredPowerLevel;
    const lock = allowed ? '✅' : '🔒';

    return [
      `${lock} **${item.name}**`,
      `Type : ${item.type} · Rareté : ${item.rarity}`,
      `Prix : **${formatNumber(finalPrice)} Jewels** · Rang requis : ${item.requiredMageRank} · Puissance requise : ${formatNumber(item.requiredPowerLevel)}`,
    ].join('\n');
  });

  const embed = new EmbedBuilder()
    .setColor(0x9b8cff)
    .setTitle(`🛒 Boutique — ${profile.characterName}`)
    .setDescription([
      `**Jewels :** ${formatNumber(profile.jewels)}`,
      `**Réputation :** ${profile.reputation}`,
      `**Rang :** ${profile.mageRank} · **Puissance :** ${formatNumber(profile.powerLevel)}`,
      '',
      lines.length ? lines.join('\n\n') : 'Aucun objet dans cette catégorie.',
      '',
      '*La V1 affiche la boutique et les prix dynamiques. L’achat/vente détaillé arrive en V2.*',
    ].join('\n'));

  return { embeds: [embed], components: getShopRows(), ephemeral: false };
}

async function openShopHub(interaction) {
  return interaction.reply(await buildShopEmbed(interaction, 'all'));
}

async function handleShopComponent(interaction) {
  const category = interaction.customId.replace('shop:', '');

  if (category === 'sell') {
    return interaction.reply({ content: 'La vente d’objets sera ajoutée dans la V2.', ephemeral: true });
  }

  return interaction.update(await buildShopEmbed(interaction, category));
}

module.exports = {
  openShopHub,
  handleShopComponent,
};
