const GachaAccount = require('../models/GachaAccount');
const GachaCard = require('../models/GachaCard');
const {
  FAIRY_TAIL_CARDS,
  RARITIES,
  RARITY_ORDER,
  getCardsByRarity,
} = require('../data/fairyTailCards');

const FREE_DRAW_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const FRAGMENT_SINGLE_COST = 100;
const FRAGMENT_TEN_COST = 900;

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
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
}

async function addFragments(userId, guildId, amount) {
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  return GachaAccount.findOneAndUpdate(
    { userId, guildId },
    {
      $setOnInsert: { userId, guildId },
      $inc: { fragments: safeAmount },
    },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
}

async function removeFragments(userId, guildId, amount) {
  const account = await getOrCreateGachaAccount(userId, guildId);
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  if (!requested) return { account, removed: 0 };
  const fullRemoval = await GachaAccount.findOneAndUpdate(
    { _id: account._id, fragments: { $gte: requested } },
    { $inc: { fragments: -requested } },
    { returnDocument: 'after' },
  );
  if (fullRemoval) return { account: fullRemoval, removed: requested };

  const latest = await GachaAccount.findById(account._id);
  const available = Math.max(0, Number(latest?.fragments || 0));
  if (!available) return { account: latest || account, removed: 0 };
  const partialRemoval = await GachaAccount.findOneAndUpdate(
    { _id: account._id, fragments: available },
    { $inc: { fragments: -available } },
    { returnDocument: 'after' },
  );
  if (!partialRemoval) return removeFragments(userId, guildId, requested);
  return { account: partialRemoval, removed: available };
}

async function transferFragments(fromUserId, toUserId, guildId, amount) {
  const removal = await removeFragments(fromUserId, guildId, amount);
  if (removal.removed > 0) {
    try {
      await addFragments(toUserId, guildId, removal.removed);
    } catch (error) {
      await addFragments(fromUserId, guildId, removal.removed).catch(() => null);
      throw error;
    }
  }
  return removal.removed;
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
      { returnDocument: 'after' },
    );
    if (!charged) {
      const latest = await GachaAccount.findById(account._id);
      return { ok: false, reason: `Tirage gratuit disponible dans ${formatRemainingTime(getFreeDrawRemainingMs(latest))}.` };
    }
    return { ok: true, account: charged, paymentLabel: 'Tirage gratuit', refund: { type: 'free', accountId: charged._id } };
  }

  if (['fragments', 'fragments_single', 'fragments_ten'].includes(mode)) {
    const count = mode === 'fragments_ten' ? 10 : 1;
    const cost = count === 10 ? FRAGMENT_TEN_COST : FRAGMENT_SINGLE_COST;
    const charged = await GachaAccount.findOneAndUpdate(
      { _id: account._id, fragments: { $gte: cost } },
      { $inc: { fragments: -cost } },
      { returnDocument: 'after' },
    );
    if (!charged) return { ok: false, reason: `Il faut ${cost} fragments pour ce tirage de ${count} carte(s).` };
    return {
      ok: true,
      account: charged,
      paymentLabel: `${cost} fragments — ${count} carte(s)`,
      refund: { type: 'fragments', accountId: charged._id, amount: cost },
    };
  }
  return { ok: false, reason: 'Ce type de tirage n’existe plus. Rouvre `/gacha` pour actualiser le menu.' };
}

async function refundCharge(refund) {
  if (!refund) return;
  if (refund.type === 'free') {
    await GachaAccount.findByIdAndUpdate(refund.accountId, { $set: { freeDrawAvailableAt: null } });
  } else if (refund.type === 'fragments') {
    await GachaAccount.findByIdAndUpdate(refund.accountId, { $inc: { fragments: refund.amount } });
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
  const count = mode === 'fragments_ten' ? 10 : 1;
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
      { returnDocument: 'after' },
    );

    return {
      ok: true,
      ...granted,
      account,
      paymentLabel: charge.paymentLabel,
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
  FRAGMENT_SINGLE_COST,
  FRAGMENT_TEN_COST,
  getOrCreateGachaAccount,
  addFragments,
  removeFragments,
  transferFragments,
  getFreeDrawRemainingMs,
  formatRemainingTime,
  pickWeightedRarity,
  drawCards,
  performGachaDraw,
  getCollection,
};
