const { SlashCommandBuilder } = require('discord.js');
const { openRankingHub } = require('../features/ranking/rankingHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('classement')
    .setDescription('Affiche les classements RP de Fairy Slayer.'),

  async execute(interaction) {
    return openRankingHub(interaction);
  },
};
