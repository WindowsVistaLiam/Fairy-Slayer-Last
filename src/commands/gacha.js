const { SlashCommandBuilder } = require('discord.js');
const { openGachaHub } = require('../features/gacha/gachaHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Ouvre le portail d’invocation Fairy Tail.')
    .setDMPermission(false),

  async execute(interaction) {
    return openGachaHub(interaction);
  },
};
