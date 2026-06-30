function calculateMessageXp(content, minLength = 25) {
  const length = content.trim().length;
  if (length < minLength) return 0;

  const baseXp = 5;
  const lengthBonus = Math.min(50, Math.floor(length / 20));
  return baseXp + lengthBonus;
}

function getXpNeeded(level) {
  return 100 + level * 75 + level * level * 15;
}

function applyXp(profile, gainedXp) {
  let leveledUp = false;
  let levelUps = 0;

  profile.xp += gainedXp;

  while (profile.xp >= getXpNeeded(profile.level)) {
    profile.xp -= getXpNeeded(profile.level);
    profile.level += 1;
    profile.jewels += 100 + profile.level * 25;
    leveledUp = true;
    levelUps += 1;
  }

  return { leveledUp, levelUps };
}

module.exports = {
  calculateMessageXp,
  getXpNeeded,
  applyXp,
};
