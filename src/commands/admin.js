const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { openAdminHub } = require('../features/admin/adminHub');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Ouvre le menu staff de Fairy Slayer.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    return openAdminHub(interaction);
  },
};
