const Inventory = require('../models/Inventory');

const {
  getItemById,
  getRarityLabel,
  getTypeLabel,
  getEquipSlotLabel,
  getItemEquipSlot,
  getItemPowerBonus,
} = require('../data/items');

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

  inventory.markModified('items');
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

  inventory.markModified('items');
  await inventory.save();

  return true;
}

function isEquipableItem(item) {
  return Boolean(getItemEquipSlot(item));
}

async function equipItemInInventory(profileId, itemId) {
  const inventory = await getOrCreateInventory(profileId);
  const entry = inventory.items.find((item) => item.itemId === itemId);
  const item = getItemById(itemId);
  const slot = getItemEquipSlot(item);

  if (!item) {
    return {
      success: false,
      reason: 'Objet introuvable.',
    };
  }

  if (!entry || entry.quantity <= 0) {
    return {
      success: false,
      reason: `Tu ne possèdes pas ${item.name}.`,
    };
  }

  if (!slot) {
    return {
      success: false,
      reason: `${item.name} ne peut pas être équipé.`,
    };
  }

  for (const inventoryItem of inventory.items) {
    const catalogItem = getItemById(inventoryItem.itemId);
    const catalogSlot = getItemEquipSlot(catalogItem);

    if (catalogSlot === slot) {
      inventoryItem.equipped = false;
    }
  }

  entry.equipped = true;

  inventory.markModified('items');
  await inventory.save();

  return {
    success: true,
    item,
    slot,
    slotLabel: getEquipSlotLabel(slot),
    powerBonus: getItemPowerBonus(item),
    inventory,
  };
}

async function unequipItemInInventory(profileId, itemId) {
  const inventory = await getOrCreateInventory(profileId);
  const entry = inventory.items.find((item) => item.itemId === itemId);
  const item = getItemById(itemId);
  const slot = getItemEquipSlot(item);

  if (!item) {
    return {
      success: false,
      reason: 'Objet introuvable.',
    };
  }

  if (!entry || entry.quantity <= 0) {
    return {
      success: false,
      reason: `Tu ne possèdes pas ${item.name}.`,
    };
  }

  if (!slot) {
    return {
      success: false,
      reason: `${item.name} ne peut pas être déséquipé.`,
    };
  }

  entry.equipped = false;

  inventory.markModified('items');
  await inventory.save();

  return {
    success: true,
    item,
    slot,
    slotLabel: getEquipSlotLabel(slot),
    powerBonus: getItemPowerBonus(item),
    inventory,
  };
}

async function getInventoryDetails(profileId) {
  const inventory = await getOrCreateInventory(profileId);

  return inventory.items
    .map((entry) => {
      const item = getItemById(entry.itemId);

      if (!item) return null;

      const equipSlot = getItemEquipSlot(item);
      const powerBonus = getItemPowerBonus(item);

      return {
        ...item,
        equipSlot,
        equipSlotLabel: getEquipSlotLabel(equipSlot),
        powerBonus,
        quantity: entry.quantity,
        equipped: Boolean(entry.equipped),
      };
    })
    .filter(Boolean);
}

function getEquippedSlotsFromItems(items) {
  const equippedItems = items.filter((item) => item.equipped);

  return {
    arme: equippedItems.find((item) => item.equipSlot === 'arme') || null,
    tenue: equippedItems.find((item) => item.equipSlot === 'tenue') || null,
    accessoire: equippedItems.find((item) => item.equipSlot === 'accessoire') || null,
    lacrima: equippedItems.find((item) => item.equipSlot === 'lacrima') || null,
  };
}

function calculateEquippedPowerBonusFromSlots(equippedSlots) {
  return Object.values(equippedSlots).reduce(
    (total, item) => total + Number(item?.powerBonus || 0),
    0,
  );
}

async function getInventorySummary(profileId) {
  const items = await getInventoryDetails(profileId);

  const totalQuantity = items.reduce((total, item) => total + item.quantity, 0);
  const totalValue = items.reduce((total, item) => total + item.sellPrice * item.quantity, 0);

  const byType = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + item.quantity;
    return acc;
  }, {});

  const equippedItems = items.filter((item) => item.equipped);
  const equippedSlots = getEquippedSlotsFromItems(items);
  const equippedPowerBonus = calculateEquippedPowerBonusFromSlots(equippedSlots);

  return {
    items,
    totalQuantity,
    totalValue,
    byType,
    equippedItems,
    equippedSlots,
    equippedPowerBonus,
  };
}

async function getProfilePowerWithEquipment(profile) {
  const basePower = Number(profile?.powerLevel || 0);

  if (!profile?._id) {
    return {
      basePower,
      equipmentBonus: 0,
      totalPower: basePower,
      equippedSlots: {
        arme: null,
        tenue: null,
        accessoire: null,
        lacrima: null,
      },
    };
  }

  const summary = await getInventorySummary(profile._id);
  const equipmentBonus = Number(summary.equippedPowerBonus || 0);

  return {
    basePower,
    equipmentBonus,
    totalPower: basePower + equipmentBonus,
    equippedSlots: summary.equippedSlots,
  };
}

function formatInventoryLines(items, limit = 8) {
  if (!items.length) {
    return [
      'Inventaire vide : achète des objets dans /boutique ou demande au staff de t’en donner.',
    ];
  }

  return items.slice(0, limit).map((item) => {
    const slotText = item.equipSlot ? ` - ${getEquipSlotLabel(item.equipSlot)}` : '';
    const bonusText = item.powerBonus ? ` - +${item.powerBonus} puissance` : '';
    const equippedText = item.equipped ? ' - ÉQUIPÉ' : '';

    return `${item.name} x${item.quantity} - ${getTypeLabel(item.type)}${slotText} - ${getRarityLabel(item.rarity)}${bonusText} - revente ${item.sellPrice} Jewels${equippedText}`;
  });
}

module.exports = {
  getOrCreateInventory,
  addItemToInventory,
  removeItemFromInventory,
  equipItemInInventory,
  unequipItemInInventory,
  getInventoryDetails,
  getInventorySummary,
  getProfilePowerWithEquipment,
  formatInventoryLines,
};