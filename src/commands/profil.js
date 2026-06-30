const { SlashCommandBuilder } = require('discord.js');
const { openProfileHub } = require('../features/profile/profileHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profil')
    .setDescription('Ouvre le menu complet de ton personnage Fairy Slayer.'),

  async execute(interaction) {
    return openProfileHub(interaction);
  },
};
