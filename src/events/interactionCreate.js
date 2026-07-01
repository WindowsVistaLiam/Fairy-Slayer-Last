const { handleComponentInteraction, handleModalInteraction } = require('../interactions/router');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({ content: 'Commande introuvable.', ephemeral: true });
        }

        return await command.execute(interaction, client);
      }

      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return await handleComponentInteraction(interaction);
      }

      if (interaction.isModalSubmit()) {
        return await handleModalInteraction(interaction);
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur interactionCreate :', error);

      const payload = {
        content: 'Une erreur est survenue pendant le traitement de cette action.',
        ephemeral: true,
      };

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(payload).catch(() => null);
      }

      return interaction.reply(payload).catch(() => null);
    }
  },
};
