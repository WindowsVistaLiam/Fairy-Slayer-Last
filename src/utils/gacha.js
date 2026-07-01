const GachaAccount = require('../models/GachaAccount');
const GachaCard = require('../models/GachaCard');
const Profile = require('../models/Profile');
const { getActiveProfile } = require('./activeProfile');
const {
  FAIRY_TAIL_CARDS,
  RARITIES,
  RARITY_ORDER,
  getCardsByRarity,
} = require('../data/fairyTailCards');

const FREE_DRAW_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const SINGLE_DRAW_COST = 250;
const TEN_DRAW_COST = 2250;
const FRAGMENT_DRAW_COST = 100;

const RARITY_WEIGHTS = {
  common: 6000,
  rare: 2700,
  epic: 900,
  legendary: 350,
  mythic: 50,
};

async function getOrCreateGachaAccount(userId, guildId) {
  return GachaAccount.findOneAndUpdate(
    { userId, guildId },
    { $setOnInsert: { userId, guildId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );
}

function getFreeDrawRemainingMs(account, now = Date.now()) {
  const availableAt = account?.freeDrawAvailableAt
    ? new Date(account.freeDrawAvailableAt).getTime()
    : 0;
  return Math.max(0, availableAt - now);
}

function formatRemainingTime(ms) {
  if (ms <= 0) return 'disponible';
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} h ${minutes} min`;
  if (hours) return `${hours} h`;
  return `${minutes} min`;
}

function pickWeightedRarity(minimumRarity = 'common', rng = Math.random) {
  const minimumIndex = Math.max(0, RARITY_ORDER.indexOf(minimumRarity));
  const eligible = RARITY_ORDER.slice(minimumIndex);
  const totalWeight = eligible.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);
  let roll = rng() * totalWeight;
  for (const rarity of eligible) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return eligible.at(-1);
}

function updatePityAfterRarity(state, rarity) {
  const rarityIndex = RARITY_ORDER.indexOf(rarity);
  state.pityEpic = rarityIndex >= RARITY_ORDER.indexOf('epic') ? 0 : state.pityEpic + 1;
  state.pityLegendary = rarityIndex >= RARITY_ORDER.indexOf('legendary') ? 0 : state.pityLegendary + 1;
  state.pityMythic = rarity === 'mythic' ? 0 : state.pityMythic + 1;
}

function drawCards(account, count, rng = Math.random) {
  const state = {
    pityEpic: Number(account?.pityEpic || 0),
    pityLegendary: Number(account?.pityLegendary || 0),
    pityMythic: Number(account?.pityMythic || 0),
  };
  const cards = [];

  for (let index = 0; index < count; index += 1) {
    let minimumRarity = 'common';
    if (state.pityMythic + 1 >= 100) minimumRarity = 'mythic';
    else if (state.pityLegendary + 1 >= 50) minimumRarity = 'legendary';
    else if (state.pityEpic + 1 >= 10) minimumRarity = 'epic';

    const rarity = pickWeightedRarity(minimumRarity, rng);
    const pool = getCardsByRarity(rarity);
    const card = pool[Math.floor(rng() * pool.length)] || pool[0];
    cards.push(card);
    updatePityAfterRarity(state, rarity);
  }

  return { cards, pity: state };
}

async function chargeDraw({ userId, guildId, mode }) {
  const account = await getOrCreateGachaAccount(userId, guildId);
  if (mode === 'free') {
    const now = new Date();
    const charged = await GachaAccount.findOneAndUpdate(
      {
        _id: account._id,
        $or: [
          { freeDrawAvailableAt: null },
          { freeDrawAvailableAt: { $lte: now } },
        ],
      },
      { $set: { freeDrawAvailableAt: new Date(now.getTime() + FREE_DRAW_COOLDOWN_MS) } },
      { new: true },
    );
    if (!charged) {
      const latest = await GachaAccount.findById(account._id);
      return { ok: false, reason: `Tirage gratuit disponible dans ${formatRemainingTime(getFreeDrawRemainingMs(latest))}.` };
    }
    return { ok: true, account: charged, paymentLabel: 'Tirage gratuit', refund: { type: 'free', accountId: charged._id } };
  }

  if (mode === 'fragments') {
    const charged = await GachaAccount.findOneAndUpdate(
      { _id: account._id, fragments: { $gte: FRAGMENT_DRAW_COST } },
      { $inc: { fragments: -FRAGMENT_DRAW_COST } },
      { new: true },
    );
    if (!charged) return { ok: false, reason: `Il faut ${FRAGMENT_DRAW_COST} fragments pour ce tirage.` };
    return {
      ok: true,
      account: charged,
      paymentLabel: `${FRAGMENT_DRAW_COST} fragments`,
      refund: { type: 'fragments', accountId: charged._id, amount: FRAGMENT_DRAW_COST },
    };
  }

  const count = mode === 'joyaux_ten' ? 10 : 1;
  const cost = count === 10 ? TEN_DRAW_COST : SINGLE_DRAW_COST;
  const activeProfile = await getActiveProfile(userId, guildId);
  if (!activeProfile) return { ok: false, reason: 'Crée et active d’abord un personnage avec `/profil`.' };
  const chargedProfile = await Profile.findOneAndUpdate(
    { _id: activeProfile._id, userId, guildId, jewels: { $gte: cost } },
    { $inc: { jewels: -cost } },
    { new: true },
  );
  if (!chargedProfile) return { ok: false, reason: `Il faut ${cost} Joyaux sur le profil actif.` };
  return {
    ok: true,
    account,
    profile: chargedProfile,
    paymentLabel: `${cost} Joyaux — ${chargedProfile.characterName}`,
    refund: { type: 'joyaux', profileId: chargedProfile._id, amount: cost },
  };
}

async function refundCharge(refund) {
  if (!refund) return;
  if (refund.type === 'free') {
    await GachaAccount.findByIdAndUpdate(refund.accountId, { $set: { freeDrawAvailableAt: null } });
  } else if (refund.type === 'fragments') {
    await GachaAccount.findByIdAndUpdate(refund.accountId, { $inc: { fragments: refund.amount } });
  } else if (refund.type === 'joyaux') {
    await Profile.findByIdAndUpdate(refund.profileId, { $inc: { jewels: refund.amount } });
  }
}

async function grantDrawnCards(userId, guildId, cards) {
  const owned = await GachaCard.find({ userId, guildId }).select('cardId').lean();
  const ownedIds = new Set(owned.map((entry) => entry.cardId));
  const results = [];
  let fragmentsEarned = 0;

  for (const card of cards) {
    const isNew = !ownedIds.has(card.cardId);
    if (isNew) {
      try {
        await GachaCard.create({ userId, guildId, cardId: card.cardId, copiesSeen: 1 });
        ownedIds.add(card.cardId);
        results.push({ card, isNew: true, fragmentsEarned: 0 });
        continue;
      } catch (error) {
        if (error?.code !== 11000) throw error;
        ownedIds.add(card.cardId);
      }
    }

    const fragments = Number(RARITIES[card.rarity]?.duplicateFragments || 1);
    await GachaCard.updateOne(
      { userId, guildId, cardId: card.cardId },
      { $inc: { copiesSeen: 1 } },
    );
    fragmentsEarned += fragments;
    results.push({ card, isNew: false, fragmentsEarned: fragments });
  }

  return { results, fragmentsEarned };
}

async function performGachaDraw({ userId, guildId, mode, rng = Math.random }) {
  const count = mode === 'joyaux_ten' ? 10 : 1;
  const charge = await chargeDraw({ userId, guildId, mode });
  if (!charge.ok) return charge;
  try {
    const generated = drawCards(charge.account, count, rng);
    const granted = await grantDrawnCards(userId, guildId, generated.cards);
    const account = await GachaAccount.findByIdAndUpdate(
      charge.account._id,
      {
        $set: generated.pity,
        $inc: { totalPulls: count, fragments: granted.fragmentsEarned },
      },
      { new: true },
    );

    return {
      ok: true,
      ...granted,
      account,
      paymentLabel: charge.paymentLabel,
      joyauxRemaining: charge.profile?.jewels,
    };
  } catch (error) {
    await refundCharge(charge.refund).catch(() => null);
    throw error;
  }
}

async function getCollection(userId, guildId) {
  const entries = await GachaCard.find({ userId, guildId }).sort({ obtainedAt: 1 }).lean();
  return entries
    .map((entry) => ({ ...entry, card: FAIRY_TAIL_CARDS.find((card) => card.cardId === entry.cardId) }))
    .filter((entry) => entry.card);
}

module.exports = {
  FREE_DRAW_COOLDOWN_MS,
  SINGLE_DRAW_COST,
  TEN_DRAW_COST,
  FRAGMENT_DRAW_COST,
  getOrCreateGachaAccount,
  getFreeDrawRemainingMs,
  formatRemainingTime,
  pickWeightedRarity,
  drawCards,
  performGachaDraw,
  getCollection,
};
