function getReputationLabel(value) {
  if (value <= -75) return 'Criminel recherché';
  if (value <= -40) return 'Mage dangereux';
  if (value <= -10) return 'Mal vu';
  if (value < 10) return 'Neutre';
  if (value < 40) return 'Apprécié';
  if (value < 75) return 'Respecté';
  return 'Légende de guilde';
}

function clampReputation(value) {
  return Math.max(-100, Math.min(100, Number(value) || 0));
}

module.exports = { getReputationLabel, clampReputation };
