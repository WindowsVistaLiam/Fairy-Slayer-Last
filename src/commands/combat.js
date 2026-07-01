const { SlashCommandBuilder } = require('discord.js');
const { runPve, showCombatStats, createPvpChallenge } = require('../features/combat/combatHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('combat')
    .setDescription('Combat avec les cartes de ta collection.')
    .addSubcommand((subcommand) => subcommand
      .setName('pve').setDescription('Affronte une carte contrôlée par le bot.')
      .addStringOption((option) => option.setName('carte').setDescription('Nom ou ID de ta carte ; vide = meilleure carte.').setRequired(false)))
    .addSubcommand((subcommand) => subcommand
      .setName('pvp').setDescription('Défie un autre collectionneur.')
      .addUserOption((option) => option.setName('adversaire').setDescription('Joueur à défier.').setRequired(true))
      .addStringOption((option) => option.setName('carte').setDescription('Nom ou ID de ta carte ; vide = meilleure carte.').setRequired(false)))
    .addSubcommand((subcommand) => subcommand.setName('stats').setDescription('Affiche tes statistiques PvE et PvP.'))
    .setDMPermission(false),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'stats') return showCombatStats(interaction);
    const card = interaction.options.getString('carte') || '';
    if (subcommand === 'pve') return runPve(interaction, card);
    return createPvpChallenge(interaction, interaction.options.getUser('adversaire'), card);
  },
};
