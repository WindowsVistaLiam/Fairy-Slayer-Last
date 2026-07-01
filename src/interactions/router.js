const profileHub = require('../features/profile/profileHub');
const shopHub = require('../features/shop/shopHub');
const rankingHub = require('../features/ranking/rankingHub');
const adminHub = require('../features/admin/adminHub');

const PROFILE_MENU_TIMEOUT_MS = 10 * 60 * 1000;

function disableMessageComponents(message) {
  if (!message?.components?.length) return [];

  return message.components.map((row) => {
    const rawRow = row.toJSON();

    rawRow.components = rawRow.components.map((component) => ({
      ...component,
      disabled: true,
    }));

    return rawRow;
  });
}

async function isExpiredProfileInteraction(interaction) {
  if (!interaction.customId?.startsWith('profile:')) return false;
  if (!interaction.message?.createdTimestamp) return false;

  const age = Date.now() - interaction.message.createdTimestamp;

  if (age < PROFILE_MENU_TIMEOUT_MS) return false;

  try {
    await interaction.message.edit({
      components: disableMessageComponents(interaction.message),
    });
  } catch (_) {
    // Si le message ne peut pas être édité, on ignore.
  }

  await interaction.reply({
    content: 'Ce menu `/profil` a expiré. Relance simplement `/profil` pour ouvrir un nouveau menu.',
    ephemeral: true,
  }).catch(() => null);

  return true;
}

async function handleComponentInteraction(interaction) {
  const id = interaction.customId;

  if (await isExpiredProfileInteraction(interaction)) return null;

  if (id === 'profile:home') return profileHub.openProfileHub(interaction);
  if (id === 'profile:create') return profileHub.showCreateModal(interaction);
  if (id === 'profile:switch') return profileHub.showSwitchMenu(interaction);
  if (id === 'profile:inventory') return profileHub.showInventory(interaction);
  if (id === 'profile:missions') return profileHub.showMissions(interaction);
  if (id === 'profile:relations') return profileHub.showRelations(interaction);
  if (id === 'profile:rumors') return profileHub.showRumors(interaction);
  if (id === 'profile:reputation') return profileHub.showReputation(interaction);
  if (id === 'profile:edit') return profileHub.showEditModal(interaction);
  if (id === 'profile:image') return profileHub.showImageModal(interaction);
  if (id === 'profile:switch:select') return profileHub.handleSwitchSelect(interaction);

  if (id.startsWith('shop:')) return shopHub.handleShopComponent(interaction);
  if (id.startsWith('ranking:')) return rankingHub.handleRankingComponent(interaction);
  if (id.startsWith('admin:')) return adminHub.handleAdminComponent(interaction);

  return interaction.reply({
    content: 'Interaction inconnue.',
    ephemeral: true,
  });
}

async function handleModalInteraction(interaction) {
  const id = interaction.customId;

  if (id === 'profile:create:modal') return profileHub.handleCreateModal(interaction);
  if (id === 'profile:edit:modal') return profileHub.handleEditModal(interaction);
  if (id === 'profile:image:modal') return profileHub.handleImageModal(interaction);
  if (id.startsWith('admin:')) return adminHub.handleAdminModal(interaction);

  return interaction.reply({
    content: 'Formulaire inconnu.',
    ephemeral: true,
  });
}

module.exports = {
  handleComponentInteraction,
  handleModalInteraction,
};