const { SlashCommandBuilder } = require('discord.js');
const { openShopHub } = require('../features/shop/shopHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Ouvre la boutique du personnage actif.'),

  async execute(interaction) {
    return openShopHub(interaction);
  },
};
