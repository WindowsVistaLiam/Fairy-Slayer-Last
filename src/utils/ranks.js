const MAGE_RANKS = ['C', 'B', 'A', 'S', 'Sacré'];

const RANK_WEIGHT = {
  C: 1,
  B: 2,
  A: 3,
  S: 4,
  'Sacré': 5,
};

function normalizeMageRank(value) {
  if (!value) return 'C';
  const clean = String(value).trim();
  const upper = clean.toUpperCase();

  if (upper === 'SACRE' || upper === 'SACRÉ') return 'Sacré';
  if (['C', 'B', 'A', 'S'].includes(upper)) return upper;
  return 'C';
}

function canAccessRank(profileRank, requiredRank) {
  const current = RANK_WEIGHT[normalizeMageRank(profileRank)] || 1;
  const required = RANK_WEIGHT[normalizeMageRank(requiredRank)] || 1;
  return current >= required;
}

function getRankLabel(rank) {
  const normalized = normalizeMageRank(rank);

  return {
    C: 'Mage de rang C',
    B: 'Mage de rang B',
    A: 'Mage de rang A',
    S: 'Mage de rang S',
    'Sacré': 'Mage Sacré',
  }[normalized];
}

module.exports = {
  MAGE_RANKS,
  RANK_WEIGHT,
  normalizeMageRank,
  canAccessRank,
  getRankLabel,
};
