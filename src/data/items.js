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
    powerBonus: 0,
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
    powerBonus: 0,
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
    powerBonus: 80,
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
    powerBonus: 140,
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
    powerBonus: 120,
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
    powerBonus: 260,
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
    powerBonus: 0,
    requiredRank: 'S',
    requiredPower: 3200,
    availableInShop: true,
  },
  {
    itemId: 'elixir_endurance',
    name: 'Élixir d’endurance',
    description: 'Une préparation tonique appréciée avant les longues missions.',
    type: 'consommable', equipSlot: null, rarity: 'rare', basePrice: 780, sellPrice: 280,
    powerBonus: 0, requiredRank: 'C', requiredPower: 300, availableInShop: true,
  },
  {
    itemId: 'grimoire_apprenti',
    name: 'Grimoire d’apprenti',
    description: 'Un recueil de formules élémentaires protégé par une reliure enchantée.',
    type: 'equipement', equipSlot: 'arme', rarity: 'rare', basePrice: 1550, sellPrice: 560,
    powerBonus: 130, requiredRank: 'B', requiredPower: 650, availableInShop: true,
  },
  {
    itemId: 'manteau_guilde_renforce',
    name: 'Manteau de guilde renforcé',
    description: 'Une tenue de mission résistante aux chocs et aux intempéries magiques.',
    type: 'equipement', equipSlot: 'tenue', rarity: 'epique', basePrice: 3600, sellPrice: 1300,
    powerBonus: 230, requiredRank: 'A', requiredPower: 1400, availableInShop: true,
  },
  {
    itemId: 'anneau_flux_magique',
    name: 'Anneau de flux magique',
    description: 'Canalise les réserves magiques et stabilise les sorts complexes.',
    type: 'equipement', equipSlot: 'accessoire', rarity: 'rare', basePrice: 2400, sellPrice: 850,
    powerBonus: 170, requiredRank: 'B', requiredPower: 900, availableInShop: true,
  },
  {
    itemId: 'lacrima_vent_celeste',
    name: 'Lacrima du vent céleste',
    description: 'Une lacrima claire parcourue de courants d’air lumineux.',
    type: 'lacrima', equipSlot: 'lacrima', rarity: 'epique', basePrice: 5200, sellPrice: 1900,
    powerBonus: 320, requiredRank: 'A', requiredPower: 1900, availableInShop: true,
  },
  {
    itemId: 'lame_draconique_ecarlate',
    name: 'Lame draconique écarlate',
    description: 'Une arme forgée avec des écailles anciennes qui réagit aux fortes magies.',
    type: 'equipement', equipSlot: 'arme', rarity: 'legendaire', basePrice: 9800, sellPrice: 3600,
    powerBonus: 520, requiredRank: 'S', requiredPower: 3000, availableInShop: true,
  },
  {
    itemId: 'armure_constellation',
    name: 'Armure des constellations',
    description: 'Une tenue rare dont les plaques dessinent un ciel étoilé en mouvement.',
    type: 'equipement', equipSlot: 'tenue', rarity: 'legendaire', basePrice: 11000, sellPrice: 4100,
    powerBonus: 580, requiredRank: 'S', requiredPower: 3400, availableInShop: true,
  },
  {
    itemId: 'talisman_esprit_ancien',
    name: 'Talisman de l’esprit ancien',
    description: 'Un talisman chargé d’une présence protectrice venue d’un autre âge.',
    type: 'equipement', equipSlot: 'accessoire', rarity: 'legendaire', basePrice: 12500, sellPrice: 4600,
    powerBonus: 610, requiredRank: 'S', requiredPower: 3800, availableInShop: true,
  },
  {
    itemId: 'lacrima_arcane_primordiale',
    name: 'Lacrima arcane primordiale',
    description: 'Un noyau magique presque vivant réservé aux mages les plus accomplis.',
    type: 'lacrima', equipSlot: 'lacrima', rarity: 'mythique', basePrice: 22000, sellPrice: 8200,
    powerBonus: 900, requiredRank: 'Sacré', requiredPower: 6000, availableInShop: true,
  },
  {
    itemId: 'sceau_guilde_noire',
    name: 'Sceau de guilde noire',
    description: 'Une preuve compromettante récupérée pendant une enquête dangereuse.',
    type: 'mission', equipSlot: null, rarity: 'epique', basePrice: 0, sellPrice: 900,
    powerBonus: 0, requiredRank: 'C', requiredPower: 0, availableInShop: false,
  },
  {
    itemId: 'ecaille_dragon_ancien',
    name: 'Écaille de dragon ancien',
    description: 'Un vestige mythique irradiant encore une puissance écrasante.',
    type: 'rare', equipSlot: null, rarity: 'mythique', basePrice: 0, sellPrice: 9500,
    powerBonus: 0, requiredRank: 'Sacré', requiredPower: 0, availableInShop: false,
  },
  {
    itemId: 'potion_soin_majeure',
    name: 'Potion de soin majeure',
    description: 'Une potion concentrée destinée aux retours de missions de haut rang.',
    type: 'consommable', equipSlot: null, rarity: 'epique', basePrice: 2100, sellPrice: 760,
    powerBonus: 0, requiredRank: 'A', requiredPower: 1200, availableInShop: true,
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

function getItemPowerBonus(item) {
  return Number(item?.powerBonus || 0);
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
  getItemPowerBonus,
};
