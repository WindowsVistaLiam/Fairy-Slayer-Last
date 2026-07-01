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