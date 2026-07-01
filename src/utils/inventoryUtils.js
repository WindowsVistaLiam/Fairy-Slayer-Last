const Inventory = require('../models/Inventory');
const { getItemById, getRarityLabel, getTypeLabel } = require('../data/items');

async function getOrCreateInventory(profileId) {
  let inventory = await Inventory.findOne({ profileId });

  if (!inventory) {
    inventory = await Inventory.create({
      profileId,
      items: [],
    });
  }

  return inventory;
}

async function addItemToInventory(profileId, itemId, quantity = 1) {
  const inventory = await getOrCreateInventory(profileId);
  const existingItem = inventory.items.find((item) => item.itemId === itemId);

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    inventory.items.push({
      itemId,
      quantity,
      equipped: false,
    });
  }

  await inventory.save();

  return inventory;
}

async function removeItemFromInventory(profileId, itemId, quantity = 1) {
  const inventory = await getOrCreateInventory(profileId);
  const existingItem = inventory.items.find((item) => item.itemId === itemId);

  if (!existingItem || existingItem.quantity < quantity) {
    return false;
  }

  existingItem.quantity -= quantity;

  if (existingItem.quantity <= 0) {
    inventory.items = inventory.items.filter((item) => item.itemId !== itemId);
  }

  await inventory.save();

  return true;
}

async function getInventoryDetails(profileId) {
  const inventory = await getOrCreateInventory(profileId);

  return inventory.items
    .map((entry) => {
      const item = getItemById(entry.itemId);

      if (!item) return null;

      return {
        ...item,
        quantity: entry.quantity,
        equipped: entry.equipped,
      };
    })
    .filter(Boolean);
}

async function getInventorySummary(profileId) {
  const items = await getInventoryDetails(profileId);

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const totalValue = items.reduce((total, item) => total + item.sellPrice * item.quantity, 0);

  const byType = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.quantity;
    return acc;
  }, {});

  return {
    items,
    totalQuantity,
    totalValue,
    byType,
  };
}

function formatInventoryLines(items, limit = 8) {
  if (!items.length) {
    return [
      'Inventaire vide : achète des objets dans /boutique ou demande au staff de t’en donner.',
    ];
  }

  return items.slice(0, limit).map((item) => (
    `${item.name} x${item.quantity} - ${getTypeLabel(item.type)} - ${getRarityLabel(item.rarity)} - revente ${item.sellPrice} Jewels`
  ));
}

module.exports = {
  getOrCreateInventory,
  addItemToInventory,
  removeItemFromInventory,
  getInventoryDetails,
  getInventorySummary,
  formatInventoryLines,
};