const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getItemById } = require('../../data/items');
const { getRecipesForProfession, getRecipeById } = require('../../data/recipes');
const { getProfession } = require('../../data/professions');
const { getActiveProfile } = require('../../utils/activeProfile');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { craftInventoryItem, getInventoryDetails } = require('../../utils/inventoryUtils');

function formatIngredients(recipe, ownedById) {
  return Object.entries(recipe.ingredients).map(([itemId, quantity]) => {
    const item = getItemById(itemId);
    const owned = ownedById.get(itemId) || 0;
    return `${item?.name || itemId} ${owned}/${quantity}`;
  }).join(', ');
}

async function openCraftHub(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return interaction.reply({ content: 'Tu dois d’abord créer un personnage avec `/profil`.', flags: MessageFlags.Ephemeral });

  const profession = getProfession(profile.profession);
  const recipes = getRecipesForProfession(profile.profession);
  if (!profession?.craftCategory || !recipes.length) {
    return interaction.reply({
      content: profile.profession
        ? `Le métier **${profession?.name || profile.profession}** ne possède pas d’atelier de craft.`
        : 'Choisis d’abord un métier avec `/metier`. Seuls Alchimiste, Forgeron, Armurier et Rédacteur peuvent fabriquer.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const inventory = await getInventoryDetails(profile._id);
  const ownedById = new Map(inventory.map((item) => [item.itemId, Number(item.quantity || 0)]));
  const lines = recipes.map((recipe) => {
    const output = getItemById(recipe.outputItemId);
    return `${output?.name || recipe.outputItemId} - ${formatIngredients(recipe, ownedById)}`;
  });
  const options = recipes.map((recipe) => {
    const output = getItemById(recipe.outputItemId);
    const canCraft = Object.entries(recipe.ingredients).every(([itemId, quantity]) => (ownedById.get(itemId) || 0) >= quantity);
    return new StringSelectMenuOptionBuilder()
      .setLabel((output?.name || recipe.outputItemId).slice(0, 100))
      .setDescription(`${canCraft ? 'Prêt à fabriquer' : 'Ingrédients manquants'} - ${formatIngredients(recipe, ownedById)}`.slice(0, 100))
      .setValue(recipe.recipeId);
  });

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-craft.png', variant: 'inventory',
    section: `Atelier - ${profession.name}`, title: `${recipes.length} recette(s) disponibles`,
    subtitle: 'Sélectionner une recette consomme ses ingrédients et fabrique un exemplaire.',
    stats: [
      { label: 'Artisan', value: profile.characterName },
      { label: 'Métier', value: profession.name },
      { label: 'Recettes', value: String(recipes.length) },
      { label: 'Matériaux', value: String(inventory.filter((item) => item.type === 'materiau').reduce((sum, item) => sum + item.quantity, 0)) },
    ],
    lines, footer: 'Les matières premières sont disponibles dans /boutique.',
  });
  const components = [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('craft:make').setPlaceholder('Choisir une recette').addOptions(options),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('craft:refresh').setLabel('Actualiser').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    ),
  ];
  const payload = createLargeCanvasPayload({ attachment, components });
  if (interaction.isStringSelectMenu?.() || interaction.isButton?.()) return interaction.update(payload);
  return interaction.reply(payload);
}

async function craftItem(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return interaction.reply({ content: 'Aucun personnage actif.', flags: MessageFlags.Ephemeral });
  const recipe = getRecipeById(interaction.values[0]);
  if (!recipe || recipe.profession !== profile.profession) {
    return interaction.reply({ content: 'Ton métier ne permet pas cette fabrication.', flags: MessageFlags.Ephemeral });
  }
  const result = await craftInventoryItem(profile._id, recipe);
  if (!result.success) {
    const missing = result.missing.map(({ itemId, requiredQuantity, owned }) => `${getItemById(itemId)?.name || itemId} (${owned}/${requiredQuantity})`).join(', ');
    return interaction.reply({ content: `Ingrédients manquants : ${missing}.`, flags: MessageFlags.Ephemeral });
  }
  const output = getItemById(recipe.outputItemId);
  await interaction.reply({ content: `✅ **${output?.name || recipe.outputItemId}** a été fabriqué et ajouté à ton inventaire.`, flags: MessageFlags.Ephemeral });
  return null;
}

async function handleCraftComponent(interaction) {
  if (interaction.customId === 'craft:make') return craftItem(interaction);
  if (interaction.customId === 'craft:refresh') return openCraftHub(interaction);
  return interaction.reply({ content: 'Action de craft inconnue.', flags: MessageFlags.Ephemeral });
}

module.exports = { openCraftHub, handleCraftComponent };
