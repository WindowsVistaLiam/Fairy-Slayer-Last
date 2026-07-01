const { SlashCommandBuilder } = require('discord.js');
const { openShopHub } = require('../features/shop/shopHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('Ouvre la boutique Fairy Slayer.'),

  async execute(interaction) {
    return openShopHub(interaction);
  },
};