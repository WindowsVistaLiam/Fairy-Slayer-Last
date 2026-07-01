const { SlashCommandBuilder } = require('discord.js');
const { openAdminHub } = require('../features/admin/adminHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Ouvre le menu staff de Fairy Slayer.'),

  async execute(interaction) {
    return openAdminHub(interaction);
  },
};
