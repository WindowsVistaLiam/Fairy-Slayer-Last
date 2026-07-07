const { MessageFlags } = require('discord.js');

const { handleComponentInteraction, handleModalInteraction } = require('../interactions/router');
const { sendInteractionLog } = require('../utils/discordLogs');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    const startedAt = Date.now();
    let interactionError = null;

    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return interaction.reply({ content: 'Commande introuvable.', flags: MessageFlags.Ephemeral });
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
      interactionError = error;
      console.error('❌ Erreur interactionCreate :', error);

      const payload = {
        content: 'Une erreur est survenue pendant le traitement de cette action.',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(payload).catch(() => null);
      }

      return interaction.reply(payload).catch(() => null);
    } finally {
      await sendInteractionLog(interaction, {
        durationMs: Date.now() - startedAt,
        error: interactionError,
      }).catch((error) => console.error('❌ Erreur du journal des interactions :', error));
    }
  },
};
