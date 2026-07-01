const { SlashCommandBuilder } = require('discord.js');
const { runDaily } = require('../features/daily/dailyHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Réalise une activité quotidienne pour gagner des fragments.')
    .addSubcommand((subcommand) => subcommand.setName('expedition').setDescription('Récompense stable et sans risque.'))
    .addSubcommand((subcommand) => subcommand.setName('enquete').setDescription('Récompense intermédiaire et sans risque.'))
    .addSubcommand((subcommand) => subcommand.setName('raid').setDescription('Gros gain possible, avec risque de perdre des fragments.'))
    .setDMPermission(false),

  async execute(interaction) {
    return runDaily(interaction, interaction.options.getSubcommand());
  },
};
