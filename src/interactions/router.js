const { MessageFlags } = require('discord.js');

const profileHub = require('../features/profile/profileHub');
const shopHub = require('../features/shop/shopHub');
const rankingHub = require('../features/ranking/rankingHub');
const adminHub = require('../features/admin/adminHub');
const missionHub = require('../features/missions/missionHub');
const relationHub = require('../features/relations/relationHub');
const rumorHub = require('../features/rumors/rumorHub');
const gachaHub = require('../features/gacha/gachaHub');

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

async function safeEphemeralReply(interaction, content) {
  const payload = {
    content,
    flags: MessageFlags.Ephemeral,
  };

  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(payload);
    }

    return await interaction.reply(payload);
  } catch (_) {
    return null;
  }
}

async function isExpiredProfileInteraction(interaction) {
  if (!interaction.customId?.startsWith('profile:')) return false;
  if (!interaction.message?.createdTimestamp) return false;

  const age = Date.now() - interaction.message.createdTimestamp;

  if (age < PROFILE_MENU_TIMEOUT_MS) return false;

  try {
    const disabledComponents = disableMessageComponents(interaction.message);

    if (disabledComponents.length) {
      await interaction.message.edit({
        components: disabledComponents,
      });
    }
  } catch (_) {
    // Message supprimé, déjà modifié, ou impossible à éditer.
  }

  await safeEphemeralReply(
    interaction,
    'Ce menu `/profil` a expiré. Relance simplement `/profil` pour ouvrir un nouveau menu.',
  );

  return true;
}

async function handleComponentInteraction(interaction) {
  const id = interaction.customId;

  if (await isExpiredProfileInteraction(interaction)) {
    return null;
  }

  // Profil principal
  if (id === 'profile:home') return profileHub.openProfileHub(interaction);
  if (id === 'profile:create') return profileHub.showCreateModal(interaction);
  if (id === 'profile:switch') return profileHub.showSwitchMenu(interaction);
  if (id === 'profile:switch:select') return profileHub.handleSwitchSelect(interaction);
  if (id === 'profile:edit') return profileHub.showEditModal(interaction);
  if (id === 'profile:image') return profileHub.showImageModal(interaction);

  // Inventaire
  if (id === 'profile:inventory') return profileHub.showInventory(interaction, 'all');
  if (id === 'profile:equipment') return profileHub.showEquipment(interaction);
  if (id === 'profile:inventory:all') return profileHub.showInventory(interaction, 'all');
  if (id === 'profile:inventory:consommable') return profileHub.showInventory(interaction, 'consommable');
  if (id === 'profile:inventory:equipement') return profileHub.showInventory(interaction, 'equipement');
  if (id === 'profile:inventory:lacrima') return profileHub.showInventory(interaction, 'lacrima');
  if (id === 'profile:inventory:rare') return profileHub.showInventory(interaction, 'rare');
  if (id === 'profile:inventory:mission') return profileHub.showInventory(interaction, 'mission');
  if (id === 'profile:inventory:item') return profileHub.showInventoryItem(interaction);
  if (id.startsWith('profile:inventory:use:')) return profileHub.useInventoryItem(interaction);
  if (id.startsWith('profile:inventory:equip:')) return profileHub.equipInventoryItemAction(interaction);
  if (id.startsWith('profile:inventory:unequip:')) return profileHub.unequipInventoryItemAction(interaction);

  // Missions
  if (id === 'profile:missions') return missionHub.showMissionBoard(interaction);
  if (id.startsWith('mission:')) return missionHub.handleMissionComponent(interaction);

  // Relations
  if (id === 'profile:relations') return relationHub.showRelations(interaction);
  if (id.startsWith('relation:')) return relationHub.handleRelationComponent(interaction);

  // Rumeurs
  if (id === 'profile:rumors') return rumorHub.showRumors(interaction);
  if (id.startsWith('rumor:')) return rumorHub.handleRumorComponent(interaction);

  // Autres pages profil
  if (id === 'profile:reputation') return profileHub.showReputation(interaction);

  // Boutique
  if (id.startsWith('shop:')) return shopHub.handleShopComponent(interaction);

  // Classement
  if (id.startsWith('ranking:')) return rankingHub.handleRankingComponent(interaction);

  // Admin
  if (id.startsWith('admin:')) return adminHub.handleAdminComponent(interaction);

  // Gacha et collection de cartes
  if (id.startsWith('gacha:')) return gachaHub.handleGachaComponent(interaction);

  return safeEphemeralReply(interaction, `Interaction inconnue : \`${id}\``);
}

async function handleModalInteraction(interaction) {
  const id = interaction.customId;

  // Profil
  if (id === 'profile:create:modal') return profileHub.handleCreateModal(interaction);
  if (id === 'profile:edit:modal') return profileHub.handleEditModal(interaction);
  if (id === 'profile:image:modal') return profileHub.handleImageModal(interaction);

  // Relations
  if (id.startsWith('relation:')) return relationHub.handleRelationModal(interaction);

  // Rumeurs
  if (id.startsWith('rumor:')) return rumorHub.handleRumorModal(interaction);

  // Admin
  if (id.startsWith('admin:')) return adminHub.handleAdminModal(interaction);

  return safeEphemeralReply(interaction, `Formulaire inconnu : \`${id}\``);
}

module.exports = {
  handleComponentInteraction,
  handleModalInteraction,
};
