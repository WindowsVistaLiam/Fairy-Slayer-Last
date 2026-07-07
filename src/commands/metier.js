const { SlashCommandBuilder } = require('discord.js');
const { openProfessionHub } = require('../features/professions/professionHub');

module.exports = {
  data: new SlashCommandBuilder().setName('metier').setDescription('Choisis ou consulte le métier de ton personnage actif.').setDMPermission(false),
  async execute(interaction) { return openProfessionHub(interaction); },
};
