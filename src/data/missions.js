const MISSIONS = [
  {
    missionId: 'mission_c_livraison_magnolia',
    title: 'Livraison à Magnolia',
    description: 'Une mission simple : livrer un colis magique fragile à un marchand de Magnolia.',
    rank: 'C',
    requiredPowerLevel: 0,
    objectives: [
      'Récupérer le colis auprès du client.',
      'Éviter les dégâts pendant le trajet.',
      'Remettre le colis au marchand.',
    ],
    rewards: {
      xp: 80,
      jewels: 250,
      reputation: 1,
      items: [],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_c_nuisibles_ferme',
    title: 'Nuisibles dans une ferme',
    description: 'Des créatures mineures perturbent une ferme proche de la guilde. Il faut les repousser sans détruire les cultures.',
    rank: 'C',
    requiredPowerLevel: 150,
    objectives: [
      'Identifier les créatures.',
      'Protéger les habitants.',
      'Régler le problème avec un minimum de dégâts.',
    ],
    rewards: {
      xp: 110,
      jewels: 320,
      reputation: 1,
      items: ['potion_soin_mineure'],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_b_escorte_marchand',
    title: 'Escorte d’un marchand',
    description: 'Un marchand transporte des marchandises rares et demande une escorte jusqu’à la ville voisine.',
    rank: 'B',
    requiredPowerLevel: 800,
    objectives: [
      'Escorter le marchand.',
      'Gérer une menace sur la route.',
      'Garantir l’arrivée de la cargaison.',
    ],
    rewards: {
      xp: 230,
      jewels: 850,
      reputation: 2,
      items: [],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_b_lacrima_instable',
    title: 'Lacrima instable',
    description: 'Une lacrima instable émet une énergie dangereuse dans un ancien atelier magique.',
    rank: 'B',
    requiredPowerLevel: 1000,
    objectives: [
      'Sécuriser la zone.',
      'Analyser la lacrima.',
      'Stabiliser ou récupérer le fragment.',
    ],
    rewards: {
      xp: 280,
      jewels: 1000,
      reputation: 2,
      items: ['potion_magique'],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_a_rumeur_guilde_noire',
    title: 'Rumeur de guilde noire',
    description: 'Une rumeur parle d’une guilde noire opérant discrètement dans la région. Il faut enquêter.',
    rank: 'A',
    requiredPowerLevel: 1700,
    objectives: [
      'Interroger les témoins.',
      'Trouver une piste fiable.',
      'Récupérer une preuve exploitable.',
    ],
    rewards: {
      xp: 520,
      jewels: 2200,
      reputation: 4,
      items: [],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_s_chasse_monstre',
    title: 'Chasse au monstre classé S',
    description: 'Une créature extrêmement dangereuse menace une zone isolée. Cette mission est réservée aux mages expérimentés.',
    rank: 'S',
    requiredPowerLevel: 3200,
    objectives: [
      'Localiser la créature.',
      'Survivre à l’affrontement.',
      'Neutraliser ou repousser la menace.',
    ],
    rewards: {
      xp: 950,
      jewels: 5200,
      reputation: 8,
      items: ['fragment_lacrima_sacree'],
    },
    isAvailable: true,
  },
  {
    missionId: 'mission_c_bibliotheque_hantee',
    title: 'La bibliothèque agitée',
    description: 'Des livres enchantés sèment le chaos dans la bibliothèque municipale.',
    rank: 'C', requiredPowerLevel: 200,
    objectives: ['Calmer les ouvrages animés.', 'Identifier le sort déclencheur.', 'Rendre les lieux sans dégâts.'],
    rewards: { xp: 130, jewels: 380, reputation: 1, items: ['elixir_endurance'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_b_convoi_lacrimas',
    title: 'Convoi de lacrimas',
    description: 'Un convoi de lacrimas doit traverser une route convoitée par des bandits.',
    rank: 'B', requiredPowerLevel: 1100,
    objectives: ['Sécuriser le convoi.', 'Déjouer une embuscade.', 'Livrer toutes les lacrimas.'],
    rewards: { xp: 320, jewels: 1200, reputation: 2, items: ['potion_magique'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_b_esprit_foret',
    title: 'L’esprit de la forêt',
    description: 'Un esprit blessé dérègle l’écosystème magique d’une forêt voisine.',
    rank: 'B', requiredPowerLevel: 1300,
    objectives: ['Retrouver l’esprit.', 'Comprendre sa colère.', 'Restaurer l’équilibre magique.'],
    rewards: { xp: 360, jewels: 1450, reputation: 3, items: ['anneau_flux_magique'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_a_infiltration_guilde_noire',
    title: 'Infiltration de la guilde noire',
    description: 'Une cellule clandestine prépare un rituel interdit sous une ville marchande.',
    rank: 'A', requiredPowerLevel: 2200,
    objectives: ['Entrer sans déclencher l’alarme.', 'Identifier les responsables.', 'Rapporter une preuve.'],
    rewards: { xp: 620, jewels: 2800, reputation: 5, items: ['sceau_guilde_noire'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_a_tempete_magique',
    title: 'Au cœur de la tempête magique',
    description: 'Une tempête alimentée par une lacrima menace plusieurs villages côtiers.',
    rank: 'A', requiredPowerLevel: 2600,
    objectives: ['Évacuer les habitants.', 'Atteindre le noyau de la tempête.', 'Neutraliser la lacrima.'],
    rewards: { xp: 700, jewels: 3400, reputation: 5, items: ['lacrima_vent_celeste'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_s_citadelle_ombres',
    title: 'La citadelle des ombres',
    description: 'Une forteresse oubliée réapparaît chaque nuit et libère des créatures hostiles.',
    rank: 'S', requiredPowerLevel: 4200,
    objectives: ['Franchir les défenses.', 'Briser l’ancrage dimensionnel.', 'Évacuer avant l’aube.'],
    rewards: { xp: 1200, jewels: 6800, reputation: 10, items: ['talisman_esprit_ancien'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_s_eveil_draconique',
    title: 'L’éveil draconique',
    description: 'Une présence draconique ancienne vient de s’éveiller sous les montagnes.',
    rank: 'S', requiredPowerLevel: 5000,
    objectives: ['Explorer le sanctuaire.', 'Résister à l’aura draconique.', 'Empêcher l’éveil complet.'],
    rewards: { xp: 1500, jewels: 8500, reputation: 12, items: ['ecaille_dragon_ancien'] },
    isAvailable: true,
  },
  {
    missionId: 'mission_sacre_faille_ether',
    title: 'La faille de l’Éther',
    description: 'Une faille menace d’engloutir la magie de la région. Seuls les mages sacrés peuvent l’approcher.',
    rank: 'Sacré', requiredPowerLevel: 7000,
    objectives: ['Stabiliser les quatre sceaux.', 'Affronter le gardien éthéré.', 'Refermer définitivement la faille.'],
    rewards: { xp: 2400, jewels: 15000, reputation: 20, items: ['lacrima_arcane_primordiale'] },
    isAvailable: true,
  },
];

function getAllMissions() {
  return MISSIONS;
}

function getAvailableMissions() {
  return MISSIONS.filter((mission) => mission.isAvailable);
}

function getMissionById(missionId) {
  return MISSIONS.find((mission) => mission.missionId === missionId) || null;
}

function getRankPower(rank) {
  const values = {
    C: 1,
    B: 2,
    A: 3,
    S: 4,
    Sacré: 5,
  };

  return values[rank] || 1;
}

function getMissionRewardText(mission) {
  const rewards = mission?.rewards || {};
  const parts = [];

  if (rewards.xp) parts.push(`${rewards.xp} XP`);
  if (rewards.jewels) parts.push(`${rewards.jewels} Joyaux`);
  if (rewards.reputation) parts.push(`${rewards.reputation > 0 ? '+' : ''}${rewards.reputation} réputation`);
  if (rewards.items?.length) parts.push(`${rewards.items.length} objet(s)`);

  return parts.length ? parts.join(' · ') : 'Aucune récompense';
}

function canProfileAccessMission(profile, mission, totalPower) {
  const profileRankPower = getRankPower(profile?.mageRank || 'C');
  const missionRankPower = getRankPower(mission?.rank || 'C');

  if (profileRankPower < missionRankPower) {
    return {
      allowed: false,
      reason: `rang ${mission.rank} requis`,
    };
  }

  if (Number(totalPower || 0) < Number(mission.requiredPowerLevel || 0)) {
    return {
      allowed: false,
      reason: `${mission.requiredPowerLevel} puissance requise`,
    };
  }

  return {
    allowed: true,
    reason: 'accessible',
  };
}

module.exports = {
  MISSIONS,
  getAllMissions,
  getAvailableMissions,
  getMissionById,
  getMissionRewardText,
  canProfileAccessMission,
};
