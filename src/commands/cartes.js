const { SlashCommandBuilder } = require('discord.js');
const { showCatalog } = require('../features/gacha/gachaHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cartes')
    .setDescription('Parcourt le catalogue des cartes Fairy Tail.')
    .addStringOption((option) => option
      .setName('recherche')
      .setDescription('Personnage, rareté ou faction à rechercher.')
      .setMaxLength(20)
      .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    return showCatalog(interaction, 0, interaction.options.getString('recherche') || '');
  },
};
