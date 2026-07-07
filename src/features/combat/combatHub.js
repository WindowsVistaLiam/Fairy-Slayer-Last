const { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const CombatSession = require('../../models/CombatSession');
const CombatStats = require('../../models/CombatStats');
const GachaCard = require('../../models/GachaCard');
const { getCardById, getCardsByRarity } = require('../../data/fairyTailCards');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { formatNumber } = require('../../utils/format');
const { getCollection, addFragments, removeFragments, transferFragments, formatRemainingTime } = require('../../utils/gacha');

const PVE_COOLDOWN_MS = 30 * 60 * 1000;
const PVP_COOLDOWN_MS = 10 * 60 * 1000;
const PVP_TRANSFER = 50;
const PVE_REWARDS = { common: 30, rare: 45, epic: 70, legendary: 110, mythic: 180 };
const PVE_PENALTIES = { common: 5, rare: 10, epic: 15, legendary: 25, mythic: 40 };

function normalize(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function getOrCreateCombatStats(userId, guildId) {
  return CombatStats.findOneAndUpdate(
    { userId, guildId },
    { $setOnInsert: { userId, guildId } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
}

async function resolveOwnedCard(userId, guildId, search = '') {
  const collection = await getCollection(userId, guildId);
  if (!collection.length) return null;
  if (!search) return collection.sort((a, b) => b.card.value - a.card.value)[0];
  const query = normalize(search);
  return collection.find((entry) => normalize(entry.card.cardId) === query || normalize(entry.card.name) === query)
    || collection.find((entry) => normalize(entry.card.cardId).includes(query) || normalize(entry.card.name).includes(query));
}

function combatRoll(card, rng = Math.random) {
  const variance = 0.82 + rng() * 0.36;
  return Math.round(Number(card.value || 1) * variance);
}

function cooldownRemaining(lastAt, cooldownMs) {
  if (!lastAt) return 0;
  return Math.max(0, new Date(lastAt).getTime() + cooldownMs - Date.now());
}

async function runPve(interaction, search = '', rng = Math.random) {
  await interaction.deferReply();
  const owned = await resolveOwnedCard(interaction.user.id, interaction.guildId, search);
  if (!owned) return interaction.editReply({ content: 'Tu dois posséder au moins une carte. Utilise `/gacha`.' });
  const stats = await getOrCreateCombatStats(interaction.user.id, interaction.guildId);
  const remaining = cooldownRemaining(stats.lastPveAt, PVE_COOLDOWN_MS);
  if (remaining > 0) return interaction.editReply({ content: `⏳ Prochain combat PvE dans **${formatRemainingTime(remaining)}**.` });
  const claimedCooldown = await CombatStats.findOneAndUpdate(
    {
      _id: stats._id,
      $or: [
        { lastPveAt: null },
        { lastPveAt: { $lte: new Date(Date.now() - PVE_COOLDOWN_MS) } },
      ],
    },
    { $set: { lastPveAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!claimedCooldown) return interaction.editReply({ content: '⏳ Un combat PvE vient déjà d’être lancé.' });

  const enemyPool = getCardsByRarity(owned.card.rarity).filter((card) => card.cardId !== owned.card.cardId);
  const enemy = enemyPool[Math.floor(rng() * enemyPool.length)] || getCardsByRarity(owned.card.rarity)[0];
  const playerPower = combatRoll(owned.card, rng);
  const enemyPower = combatRoll(enemy, rng);
  const won = playerPower >= enemyPower;
  let fragments;
  let account;
  if (won) {
    fragments = PVE_REWARDS[enemy.rarity];
    account = await addFragments(interaction.user.id, interaction.guildId, fragments);
  } else {
    const removal = await removeFragments(interaction.user.id, interaction.guildId, PVE_PENALTIES[enemy.rarity]);
    fragments = -removal.removed;
    account = removal.account;
  }
  await CombatStats.findByIdAndUpdate(stats._id, {
    $inc: won
      ? { pveWins: 1, fragmentsWon: fragments }
      : { pveLosses: 1, fragmentsLost: Math.abs(fragments) },
  });

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-combat-pve.png', variant: 'combat',
    section: 'Combat PvE', title: won ? 'Victoire !' : 'Défaite',
    subtitle: `${owned.card.characterName} affronte ${enemy.characterName}`,
    stats: [
      { label: 'Ta puissance', value: formatNumber(playerPower) },
      { label: 'Adversaire', value: formatNumber(enemyPower) },
      { label: 'Fragments', value: `${fragments >= 0 ? '+' : ''}${fragments}` },
      { label: 'Solde', value: formatNumber(account.fragments) },
    ],
    lines: [
      `Ta carte : ${owned.card.name} — ${owned.card.rarityLabel}`,
      `Ennemi : ${enemy.name} — ${enemy.rarityLabel}`,
      won ? 'Ton attaque finale fait basculer le combat.' : 'L’adversaire résiste et prend l’avantage.',
      'Cooldown PvE : 30 minutes.',
    ], footer: 'La puissance inclut une variation aléatoire de combat.',
  });
  return interaction.editReply(createLargeCanvasPayload({ attachment }));
}

async function showCombatStats(interaction) {
  await interaction.deferReply();
  const stats = await getOrCreateCombatStats(interaction.user.id, interaction.guildId);
  const totalWins = stats.pveWins + stats.pvpWins;
  const totalLosses = stats.pveLosses + stats.pvpLosses;
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-stats-combat.png', variant: 'combat', section: 'Statistiques combat',
    title: interaction.user.username, subtitle: 'Historique des combats de cartes sur ce serveur.',
    stats: [
      { label: 'Victoires', value: formatNumber(totalWins) },
      { label: 'Défaites', value: formatNumber(totalLosses) },
      { label: 'Fragments gagnés', value: formatNumber(stats.fragmentsWon) },
      { label: 'Fragments perdus', value: formatNumber(stats.fragmentsLost) },
    ],
    lines: [
      `PvE : ${stats.pveWins} victoire(s) — ${stats.pveLosses} défaite(s)`,
      `PvP : ${stats.pvpWins} victoire(s) — ${stats.pvpLosses} défaite(s)`,
      `Ratio global : ${totalWins + totalLosses ? Math.round((totalWins / (totalWins + totalLosses)) * 100) : 0} % de victoires`,
    ], footer: 'Utilise /combat pve ou /combat pvp pour faire progresser ces statistiques.',
  });
  return interaction.editReply(createLargeCanvasPayload({ attachment }));
}

async function createPvpChallenge(interaction, opponent, search = '') {
  await interaction.deferReply();
  if (!opponent || opponent.id === interaction.user.id || opponent.bot) {
    return interaction.editReply({ content: 'Choisis un autre joueur humain comme adversaire.' });
  }
  const [challengerCard, opponentCard, stats, pending] = await Promise.all([
    resolveOwnedCard(interaction.user.id, interaction.guildId, search),
    resolveOwnedCard(opponent.id, interaction.guildId),
    getOrCreateCombatStats(interaction.user.id, interaction.guildId),
    CombatSession.findOne({ guildId: interaction.guildId, challengerId: interaction.user.id, status: 'pending', expiresAt: { $gt: new Date() } }),
  ]);
  if (!challengerCard) return interaction.editReply({ content: 'Tu ne possèdes aucune carte utilisable.' });
  if (!opponentCard) return interaction.editReply({ content: 'Cet adversaire ne possède aucune carte.' });
  if (pending) return interaction.editReply({ content: 'Tu as déjà un défi PvP en attente.' });
  const remaining = cooldownRemaining(stats.lastPvpAt, PVP_COOLDOWN_MS);
  if (remaining > 0) return interaction.editReply({ content: `⏳ Prochain défi PvP dans **${formatRemainingTime(remaining)}**.` });

  const session = await CombatSession.create({
    guildId: interaction.guildId,
    challengerId: interaction.user.id,
    opponentId: opponent.id,
    challengerCardId: challengerCard.card.cardId,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-defi-pvp.png', variant: 'combat', section: 'Défi PvP',
    title: `${interaction.user.username} défie ${opponent.username}`,
    subtitle: 'Le défenseur utilisera automatiquement sa carte la plus puissante.',
    lines: [
      `Carte du challenger : ${challengerCard.card.name}`,
      `Rareté : ${challengerCard.card.rarityLabel} — Valeur ${challengerCard.card.value}`,
      `Enjeu : jusqu’à ${PVP_TRANSFER} fragments transférés du perdant au gagnant.`,
      'Le défi expire dans 10 minutes.',
    ], footer: 'Seul le joueur défié peut accepter ou refuser.',
  });
  const rows = [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`combat:accept:${session._id}`).setLabel('Accepter').setEmoji('⚔️').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`combat:refuse:${session._id}`).setLabel('Refuser').setEmoji('✖️').setStyle(ButtonStyle.Danger),
  )];
  return interaction.editReply({ content: `<@${opponent.id}>, tu as reçu un défi PvP !`, ...createLargeCanvasPayload({ attachment, components: rows }) });
}

async function updatePvpStats(winnerId, loserId, guildId, transferred) {
  await Promise.all([
    CombatStats.findOneAndUpdate(
      { userId: winnerId, guildId },
      { $setOnInsert: { userId: winnerId, guildId }, $inc: { pvpWins: 1, fragmentsWon: transferred }, $set: { lastPvpAt: new Date() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ),
    CombatStats.findOneAndUpdate(
      { userId: loserId, guildId },
      { $setOnInsert: { userId: loserId, guildId }, $inc: { pvpLosses: 1, fragmentsLost: transferred }, $set: { lastPvpAt: new Date() } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ),
  ]);
}

async function handlePvpButton(interaction, action, sessionId, rng = Math.random) {
  const session = await CombatSession.findById(sessionId).catch(() => null);
  if (!session) return interaction.reply({ content: 'Défi PvP introuvable.', flags: MessageFlags.Ephemeral });
  if (session.opponentId !== interaction.user.id) return interaction.reply({ content: 'Seul le joueur défié peut répondre.', flags: MessageFlags.Ephemeral });
  if (session.status !== 'pending') return interaction.reply({ content: 'Ce défi a déjà été traité.', flags: MessageFlags.Ephemeral });
  if (session.expiresAt.getTime() <= Date.now()) {
    session.status = 'expired'; await session.save();
    return interaction.update({ content: '⏳ Ce défi PvP a expiré.', components: [], files: [] });
  }
  if (action === 'refuse') {
    session.status = 'refused'; await session.save();
    return interaction.update({ content: '❌ Le défi PvP a été refusé.', components: [], files: [] });
  }

  const claimed = await CombatSession.findOneAndUpdate(
    { _id: session._id, status: 'pending' }, { $set: { status: 'resolving' } }, { returnDocument: 'after' },
  );
  if (!claimed) return interaction.reply({ content: 'Ce défi est déjà en résolution.', flags: MessageFlags.Ephemeral });
  await interaction.deferUpdate();
  const [challengerOwned, opponentOwned, opponentStats, challengerStats] = await Promise.all([
    GachaCard.findOne({ userId: session.challengerId, guildId: session.guildId, cardId: session.challengerCardId }).lean(),
    resolveOwnedCard(session.opponentId, session.guildId),
    getOrCreateCombatStats(session.opponentId, session.guildId),
    getOrCreateCombatStats(session.challengerId, session.guildId),
  ]);
  const challengerCard = challengerOwned ? getCardById(session.challengerCardId) : null;
  if (!challengerCard || !opponentOwned) {
    session.status = 'expired'; await session.save();
    return interaction.editReply({ content: 'Le combat est annulé : une carte n’est plus disponible.', components: [], files: [] });
  }
  const remaining = Math.max(
    cooldownRemaining(opponentStats.lastPvpAt, PVP_COOLDOWN_MS),
    cooldownRemaining(challengerStats.lastPvpAt, PVP_COOLDOWN_MS),
  );
  if (remaining > 0) {
    session.status = 'pending'; await session.save();
    return interaction.followUp({ content: `⏳ Tu dois attendre ${formatRemainingTime(remaining)} avant un PvP.`, flags: MessageFlags.Ephemeral });
  }
  const challengerPower = combatRoll(challengerCard, rng);
  const opponentPower = combatRoll(opponentOwned.card, rng);
  const challengerWon = challengerPower >= opponentPower;
  const winnerId = challengerWon ? session.challengerId : session.opponentId;
  const loserId = challengerWon ? session.opponentId : session.challengerId;
  const transferred = await transferFragments(loserId, winnerId, session.guildId, PVP_TRANSFER);
  await updatePvpStats(winnerId, loserId, session.guildId, transferred);
  session.status = 'completed'; session.winnerId = winnerId; session.fragmentsTransferred = transferred; await session.save();

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-combat-pvp.png', variant: 'combat', section: 'Résultat PvP',
    title: `<@${winnerId}> remporte le duel`, subtitle: `${transferred} fragments transférés au vainqueur.`,
    stats: [
      { label: 'Challenger', value: formatNumber(challengerPower) },
      { label: 'Défenseur', value: formatNumber(opponentPower) },
      { label: 'Transfert', value: `${transferred} fragments` },
    ],
    lines: [
      `Challenger : ${challengerCard.name}`,
      `Défenseur : ${opponentOwned.card.name}`,
      `Vainqueur : joueur ${winnerId}`,
    ], footer: 'Cooldown PvP : 10 minutes pour les deux combattants.',
  });
  return interaction.editReply({ content: `⚔️ <@${winnerId}> gagne le combat PvP !`, ...createLargeCanvasPayload({ attachment }) });
}

async function handleCombatComponent(interaction) {
  const [, action, sessionId] = interaction.customId.split(':');
  if (action === 'accept' || action === 'refuse') return handlePvpButton(interaction, action, sessionId);
  return interaction.reply({ content: 'Interaction de combat inconnue.', flags: MessageFlags.Ephemeral });
}

module.exports = {
  PVE_COOLDOWN_MS, PVP_COOLDOWN_MS, combatRoll, resolveOwnedCard,
  runPve, showCombatStats, createPvpChallenge, handleCombatComponent,
};
