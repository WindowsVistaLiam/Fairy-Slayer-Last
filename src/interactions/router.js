const profileHub = require('../features/profile/profileHub');
const shopHub = require('../features/shop/shopHub');
const rankingHub = require('../features/ranking/rankingHub');
const adminHub = require('../features/admin/adminHub');

async function handleComponentInteraction(interaction) {
  const id = interaction.customId;

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

  return interaction.reply({ content: 'Interaction inconnue.', ephemeral: true });
}

async function handleModalInteraction(interaction) {
  const id = interaction.customId;

  if (id === 'profile:create:modal') return profileHub.handleCreateModal(interaction);
  if (id === 'profile:edit:modal') return profileHub.handleEditModal(interaction);
  if (id === 'profile:image:modal') return profileHub.handleImageModal(interaction);
  if (id.startsWith('admin:')) return adminHub.handleAdminModal(interaction);

  return interaction.reply({ content: 'Formulaire inconnu.', ephemeral: true });
}

module.exports = {
  handleComponentInteraction,
  handleModalInteraction,
};
