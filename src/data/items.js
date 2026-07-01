const ITEMS = [
  {
    itemId: 'potion_soin_mineure',
    name: 'Potion de soin mineure',
    description: 'Une petite potion utilisée par les mages pour récupérer après une mission.',
    type: 'consommable',
    equipSlot: null,
    rarity: 'commun',
    basePrice: 250,
    sellPrice: 90,
    requiredRank: 'C',
    requiredPower: 0,
    availableInShop: true,
  },
  {
    itemId: 'potion_magique',
    name: 'Potion magique',
    description: 'Restaure temporairement les réserves magiques d’un mage.',
    type: 'consommable',
    equipSlot: null,
    rarity: 'commun',
    basePrice: 420,
    sellPrice: 160,
    requiredRank: 'C',
    requiredPower: 0,
    availableInShop: true,
  },
  {
    itemId: 'epee_mage_fer',
    name: 'Épée de mage en fer',
    description: 'Une arme simple mais fiable, souvent utilisée par les jeunes mages combattants.',
    type: 'equipement',
    equipSlot: 'arme',
    rarity: 'commun',
    basePrice: 900,
    sellPrice: 320,
    requiredRank: 'C',
    requiredPower: 250,
    availableInShop: true,
  },
  {
    itemId: 'lacrima_feu_mineure',
    name: 'Lacrima de feu mineure',
    description: 'Une lacrima instable contenant une faible énergie de feu.',
    type: 'lacrima',
    equipSlot: 'lacrima',
    rarity: 'rare',
    basePrice: 1450,
    sellPrice: 520,
    requiredRank: 'B',
    requiredPower: 500,
    availableInShop: true,
  },
  {
    itemId: 'cape_mage_voyageur',
    name: 'Cape du mage voyageur',
    description: 'Une cape renforcée portée par les mages itinérants.',
    type: 'equipement',
    equipSlot: 'tenue',
    rarity: 'rare',
    basePrice: 1800,
    sellPrice: 700,
    requiredRank: 'B',
    requiredPower: 700,
    availableInShop: true,
  },
  {
    itemId: 'bracelet_guilde_argent',
    name: 'Bracelet de guilde argenté',
    description: 'Un bracelet gravé aux symboles des anciennes guildes.',
    type: 'equipement',
    equipSlot: 'accessoire',
    rarity: 'epique',
    basePrice: 4200,
    sellPrice: 1500,
    requiredRank: 'A',
    requiredPower: 1600,
    availableInShop: true,
  },
  {
    itemId: 'fragment_lacrima_sacree',
    name: 'Fragment de lacrima sacrée',
    description: 'Un fragment très rare utilisé dans les rituels de haute magie.',
    type: 'rare',
    equipSlot: null,
    rarity: 'legendaire',
    basePrice: 12000,
    sellPrice: 4500,
    requiredRank: 'S',
    requiredPower: 3200,
    availableInShop: true,
  },
];

function getAllItems() {
  return ITEMS;
}

function getShopItems() {
  return ITEMS.filter((item) => item.availableInShop);
}

function getItemById(itemId) {
  return ITEMS.find((item) => item.itemId === itemId) || null;
}

function getRarityLabel(rarity) {
  const labels = {
    commun: 'Commun',
    rare: 'Rare',
    epique: 'Épique',
    legendaire: 'Légendaire',
    mythique: 'Mythique',
  };

  return labels[rarity] || rarity;
}

function getTypeLabel(type) {
  const labels = {
    consommable: 'Consommable',
    equipement: 'Équipement',
    lacrima: 'Lacrima',
    rare: 'Objet rare',
    mission: 'Objet de mission',
  };

  return labels[type] || type;
}

function getEquipSlotLabel(slot) {
  const labels = {
    arme: 'Arme',
    tenue: 'Tenue',
    accessoire: 'Accessoire',
    lacrima: 'Lacrima',
  };

  return labels[slot] || 'Non équipable';
}

function getItemEquipSlot(item) {
  if (!item) return null;

  if (item.equipSlot) {
    return item.equipSlot;
  }

  if (item.type === 'lacrima') {
    return 'lacrima';
  }

  return null;
}

module.exports = {
  ITEMS,
  getAllItems,
  getShopItems,
  getItemById,
  getRarityLabel,
  getTypeLabel,
  getEquipSlotLabel,
  getItemEquipSlot,
};