function calculateFinalPrice(basePrice, profile, rumors = []) {
  let multiplier = 1;

  if (profile.reputation >= 75) multiplier -= 0.20;
  else if (profile.reputation >= 40) multiplier -= 0.12;
  else if (profile.reputation >= 10) multiplier -= 0.05;

  if (profile.reputation <= -75) multiplier += 0.30;
  else if (profile.reputation <= -40) multiplier += 0.18;
  else if (profile.reputation <= -10) multiplier += 0.08;

  for (const rumor of rumors) {
    if (rumor.type === 'negative') multiplier += Math.abs(rumor.impactShopPrice || 0);
    if (rumor.type === 'positive') multiplier -= Math.abs(rumor.impactShopPrice || 0);
  }

  return Math.max(1, Math.floor(basePrice * multiplier));
}

module.exports = { calculateFinalPrice };
