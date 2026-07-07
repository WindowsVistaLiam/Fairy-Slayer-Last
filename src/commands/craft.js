const { SlashCommandBuilder } = require('discord.js');
const { openCraftHub } = require('../features/craft/craftHub');

module.exports = {
  data: new SlashCommandBuilder().setName('craft').setDescription('Ouvre l’atelier de craft de ton métier.').setDMPermission(false),
  async execute(interaction) { return openCraftHub(interaction); },
};
