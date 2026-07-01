const { SlashCommandBuilder } = require('discord.js');
const { showCollection } = require('../features/gacha/gachaHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collection')
    .setDescription('Affiche ta collection de cartes Fairy Tail ou celle d’un joueur.')
    .addUserOption((option) => option
      .setName('utilisateur')
      .setDescription('Joueur dont tu veux consulter la collection.')
      .setRequired(false))
    .setDMPermission(false),

  async execute(interaction) {
    const user = interaction.options.getUser('utilisateur') || interaction.user;
    return showCollection(interaction, user.id, 0);
  },
};
