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

function createCatalogItem(item) {
  return {
    equipSlot: null,
    powerBonus: 0,
    requiredRank: 'C',
    requiredPower: 0,
    availableInShop: true,
    ...item,
  };
}

const MATERIAL_ITEMS = [
  ['herbe_lune', 'Herbe de lune', 'Une plante argentée utilisée dans les potions réparatrices.', 90, 30],
  ['racine_mandragore', 'Racine de mandragore', 'Une racine chargée d’énergie vitale brute.', 160, 55],
  ['eau_lacrima', 'Eau de lacrima', 'Une eau pure ayant reposé au contact d’une lacrima.', 240, 85],
  ['poussiere_etoile', 'Poussière d’étoile', 'Un catalyseur rare pour les préparations de haut rang.', 650, 220],
  ['lingot_fer', 'Lingot de fer', 'La base des armes et protections robustes.', 140, 50],
  ['acier_magique', 'Acier magique', 'Un alliage qui conduit naturellement la magie.', 420, 145],
  ['mithril', 'Lingot de mithril', 'Un métal léger et exceptionnellement résistant.', 1100, 380],
  ['ecaille_draconique', 'Écaille draconique', 'Une écaille apte à renforcer les créations légendaires.', 2800, 950],
  ['cuir_renforce', 'Cuir renforcé', 'Un cuir épais préparé pour les tenues de mission.', 180, 65],
  ['tissu_enchante', 'Tissu enchanté', 'Une étoffe parcourue de fils magiques.', 390, 135],
  ['fil_argent', 'Fil d’argent', 'Un fil conducteur servant aux coutures runiques.', 520, 180],
  ['plaque_runique', 'Plaque runique', 'Une plaque gravée capable de retenir un enchantement.', 980, 340],
  ['parchemin_vierge', 'Parchemin vierge', 'Un support traité pour recevoir des formules magiques.', 120, 40],
  ['encre_magique', 'Encre magique', 'Une encre stable qui ne s’efface pas sous l’effet des sorts.', 300, 105],
  ['cristal_memoire', 'Cristal de mémoire', 'Un cristal qui conserve les structures complexes des sorts.', 850, 295],
  ['plume_phenix', 'Plume de phénix', 'Une plume rarissime utilisée pour les ouvrages suprêmes.', 2400, 820],
].map(([itemId, name, description, basePrice, sellPrice]) => createCatalogItem({
  itemId, name, description, type: 'materiau', rarity: basePrice >= 2000 ? 'legendaire' : basePrice >= 800 ? 'epique' : basePrice >= 300 ? 'rare' : 'commun', basePrice, sellPrice,
}));

const CRAFTED_ITEMS = [
  ['potion_vigueur', 'Potion de vigueur', 'Un tonique qui dissipe la fatigue après un combat.', 'consommable', null, 'commun', 520, 185, 0, 'C', 0],
  ['antidote_arcane', 'Antidote arcanique', 'Neutralise symboliquement poisons et malédictions mineures.', 'consommable', null, 'rare', 900, 320, 0, 'C', 250],
  ['elixir_celerite', 'Élixir de célérité', 'Une préparation vive qui aiguise les réflexes.', 'consommable', null, 'rare', 1450, 510, 0, 'B', 600],
  ['potion_peau_pierre', 'Potion de peau de pierre', 'Durcit temporairement la peau comme une armure.', 'consommable', null, 'epique', 2600, 920, 0, 'A', 1300],
  ['essence_draconique', 'Essence draconique', 'Une essence brûlante réservée aux missions extrêmes.', 'consommable', null, 'legendaire', 6200, 2200, 0, 'S', 3000],
  ['panacee_celeste', 'Panacée céleste', 'Une préparation mythique réputée restaurer corps et magie.', 'consommable', null, 'mythique', 12500, 4400, 0, 'Sacré', 5500],
  ['sabre_acier_magique', 'Sabre d’acier magique', 'Une lame équilibrée qui conduit efficacement la magie.', 'equipement', 'arme', 'rare', 2200, 780, 180, 'B', 700],
  ['lance_vent', 'Lance du vent', 'Une lance légère dont la pointe fend les courants magiques.', 'equipement', 'arme', 'rare', 3100, 1100, 240, 'B', 1100],
  ['marteau_runique', 'Marteau runique', 'Un lourd marteau couvert de runes d’impact.', 'equipement', 'arme', 'epique', 5200, 1850, 360, 'A', 1900],
  ['arc_lunaire', 'Arc lunaire', 'Un arc argenté qui concentre la lumière nocturne.', 'equipement', 'arme', 'epique', 6800, 2400, 430, 'A', 2400],
  ['lame_mithril', 'Lame de mithril', 'Une arme rapide, précise et presque incassable.', 'equipement', 'arme', 'legendaire', 11200, 4000, 620, 'S', 3900],
  ['espadon_dragon', 'Espadon du dragon', 'Une arme monumentale forgée autour d’écailles draconiques.', 'equipement', 'arme', 'mythique', 24000, 8500, 980, 'Sacré', 6500],
  ['armure_cuir_mage', 'Armure de cuir du mage', 'Une protection souple adaptée aux premières missions.', 'equipement', 'tenue', 'commun', 1350, 480, 100, 'C', 350],
  ['robe_enchantee', 'Robe enchantée', 'Une robe protectrice tissée de fibres magiques.', 'equipement', 'tenue', 'rare', 2800, 990, 220, 'B', 900],
  ['cuirasse_runique', 'Cuirasse runique', 'Des plaques gravées absorbent une partie des impacts.', 'equipement', 'tenue', 'epique', 5600, 2000, 390, 'A', 2000],
  ['manteau_lunaire', 'Manteau lunaire', 'Une tenue argentée qui semble disparaître dans la nuit.', 'equipement', 'tenue', 'epique', 7200, 2550, 470, 'A', 2700],
  ['armure_mithril', 'Armure de mithril', 'Une armure complète aussi légère que résistante.', 'equipement', 'tenue', 'legendaire', 12800, 4600, 680, 'S', 4200],
  ['armure_draconique', 'Armure draconique', 'Une protection mythique couverte d’écailles anciennes.', 'equipement', 'tenue', 'mythique', 26000, 9200, 1040, 'Sacré', 7000],
  ['grimoire_soins', 'Grimoire des soins', 'Un manuel de sortilèges réparateurs fondamentaux.', 'equipement', 'arme', 'commun', 1200, 430, 90, 'C', 250],
  ['livre_flammes', 'Livre des flammes', 'Un ouvrage dont les pages restent chaudes au toucher.', 'equipement', 'arme', 'rare', 2900, 1030, 230, 'B', 900],
  ['codex_vent', 'Codex des vents', 'Des formules aériennes se déplacent entre ses pages.', 'equipement', 'arme', 'rare', 3600, 1280, 280, 'B', 1250],
  ['tome_runique', 'Tome runique', 'Un traité dense consacré aux sceaux et aux barrières.', 'equipement', 'arme', 'epique', 6100, 2150, 410, 'A', 2100],
  ['grimoire_celeste', 'Grimoire céleste', 'Un livre capable de reproduire la carte du ciel magique.', 'equipement', 'arme', 'legendaire', 11800, 4200, 640, 'S', 4000],
  ['codex_draconique', 'Codex draconique', 'Un manuscrit mythique écrit à l’encre de feu ancien.', 'equipement', 'arme', 'mythique', 24500, 8700, 1000, 'Sacré', 6800],
].map(([itemId, name, description, type, equipSlot, rarity, basePrice, sellPrice, powerBonus, requiredRank, requiredPower]) => createCatalogItem({
  itemId, name, description, type, equipSlot, rarity, basePrice, sellPrice, powerBonus, requiredRank, requiredPower,
}));

ITEMS.push(...MATERIAL_ITEMS, ...CRAFTED_ITEMS);

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
    materiau: 'Matériau de craft',
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
