const { SlashCommandBuilder } = require('discord.js');
const { openGuildHub } = require('../features/guild/guildHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guilde')
    .setDescription('Crée et gère la guilde de ton personnage actif.')
    .setDMPermission(false),

  async execute(interaction) {
    return openGuildHub(interaction);
  },
};
