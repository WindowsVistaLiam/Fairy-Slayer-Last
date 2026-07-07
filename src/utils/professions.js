const DAY_MS = 24 * 60 * 60 * 1000;

const { getProfession } = require('../data/professions');

function getProfessionLabel(professionId) {
  return getProfession(professionId)?.name || 'Sans métier';
}

function applyFarmerXpBonus(xp, professionId) {
  if (professionId !== 'fermier') return xp;
  return Math.max(1, Math.floor(Number(xp || 0) * 1.2));
}

function applyMerchantDiscount(price, professionId) {
  if (professionId !== 'marchand') return price;
  return Math.max(1, Math.floor(Number(price || 0) * 0.8));
}

async function applyTreasurerDailyIncome(profile, now = new Date()) {
  if (!profile || profile.profession !== 'tresorier') return { days: 0, amount: 0 };

  const lastPayout = profile.professionProgress?.lastTreasurerPayoutAt;
  if (!lastPayout) {
    const initialized = await profile.constructor.updateOne(
      { _id: profile._id, profession: 'tresorier', 'professionProgress.lastTreasurerPayoutAt': null },
      { $set: { 'professionProgress.lastTreasurerPayoutAt': now } },
    );
    if (initialized.modifiedCount) profile.professionProgress.lastTreasurerPayoutAt = now;
    return { days: 0, amount: 0 };
  }

  const elapsedDays = Math.floor((now.getTime() - new Date(lastPayout).getTime()) / DAY_MS);
  if (elapsedDays < 1) return { days: 0, amount: 0 };

  const previousJewels = Number(profile.jewels || 0);
  const nextJewels = Math.floor(previousJewels * (1.05 ** elapsedDays));
  const nextPayoutAt = new Date(new Date(lastPayout).getTime() + elapsedDays * DAY_MS);
  const payout = await profile.constructor.updateOne(
    { _id: profile._id, profession: 'tresorier', 'professionProgress.lastTreasurerPayoutAt': lastPayout },
    { $set: { jewels: nextJewels, 'professionProgress.lastTreasurerPayoutAt': nextPayoutAt } },
  );

  if (!payout.modifiedCount) return { days: 0, amount: 0 };
  profile.jewels = nextJewels;
  profile.professionProgress.lastTreasurerPayoutAt = nextPayoutAt;

  return { days: elapsedDays, amount: nextJewels - previousJewels };
}

module.exports = {
  getProfessionLabel,
  applyFarmerXpBonus,
  applyMerchantDiscount,
  applyTreasurerDailyIncome,
};
