const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const GachaCard = require('../../models/GachaCard');
const { FAIRY_TAIL_CARDS, RARITY_ORDER, getCardById } = require('../../data/fairyTailCards');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { createGachaResultCanvas } = require('../../canvas/gachaCanvas');
const { formatNumber } = require('../../utils/format');
const {
  FRAGMENT_SINGLE_COST,
  FRAGMENT_TEN_COST,
  getOrCreateGachaAccount,
  getFreeDrawRemainingMs,
  formatRemainingTime,
  performGachaDraw,
  getCollection,
} = require('../../utils/gacha');

const PAGE_SIZE = 10;

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function encodeSearch(value) {
  return Buffer.from(String(value || ''), 'utf8').toString('base64url') || 'none';
}

function decodeSearch(value) {
  if (!value || value === 'none') return '';
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch (_) {
    return '';
  }
}

async function respond(interaction, payload, ephemeral = true) {
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) return interaction.update(payload);
  return interaction.reply({
    ...payload,
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
  });
}

function getHomeRows({ freeAvailable, canSingle, canTen }) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha:pull:free')
        .setLabel('Tirage gratuit')
        .setEmoji('🎁')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!freeAvailable),
      new ButtonBuilder()
        .setCustomId('gacha:pull:fragments_single')
        .setLabel(`1 carte — ${FRAGMENT_SINGLE_COST} fragments`)
        .setEmoji('🧩')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canSingle),
      new ButtonBuilder()
        .setCustomId('gacha:pull:fragments_ten')
        .setLabel(`10 cartes — ${FRAGMENT_TEN_COST} fragments`)
        .setEmoji('✨')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canTen),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('gacha:collection:self:0')
        .setLabel('Ma collection')
        .setEmoji('📚')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('gacha:catalog:0:none')
        .setLabel('Catalogue')
        .setEmoji('🎴')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('gacha:info')
        .setLabel('Probabilités')
        .setEmoji('ℹ️')
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function buildHomePayload(interaction) {
  const [account, ownedCount] = await Promise.all([
    getOrCreateGachaAccount(interaction.user.id, interaction.guildId),
    GachaCard.countDocuments({ userId: interaction.user.id, guildId: interaction.guildId }),
  ]);
  const freeRemaining = getFreeDrawRemainingMs(account);
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-gacha-hub.png',
    variant: 'gacha',
    section: 'Gacha Fairy Tail',
    title: 'Portail d’invocation',
    subtitle: 'Invoque les héros et légendes de Fairy Tail pour compléter ta collection.',
    stats: [
      { label: 'Collection', value: `${ownedCount}/${FAIRY_TAIL_CARDS.length}` },
      { label: 'Fragments', value: formatNumber(account.fragments) },
      { label: 'Tirages', value: formatNumber(account.totalPulls) },
      { label: 'Prochain gratuit', value: formatRemainingTime(freeRemaining) },
    ],
    lines: [
      `Tirage gratuit : ${formatRemainingTime(freeRemaining)}`,
      `Pity Épique : ${account.pityEpic}/10 — Légendaire : ${account.pityLegendary}/50`,
      `Pity Mythique : ${account.pityMythic}/100`,
      'Chaque doublon est automatiquement transformé en fragments.',
      'Le tirage de 10 cartes garantit au minimum une Épique grâce au pity.',
      'Les Joyaux RP ne sont jamais utilisés par le gacha.',
    ],
    footer: 'Les cartes appartiennent au compte Discord sur ce serveur, pas à un personnage particulier.',
  });
  return createLargeCanvasPayload({
    attachment,
    components: getHomeRows({
      freeAvailable: freeRemaining <= 0,
      canSingle: Number(account.fragments || 0) >= FRAGMENT_SINGLE_COST,
      canTen: Number(account.fragments || 0) >= FRAGMENT_TEN_COST,
    }),
  });
}

async function openGachaHub(interaction) {
  return respond(interaction, await buildHomePayload(interaction));
}

function getResultRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gacha:home').setLabel('Retour au gacha').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('gacha:collection:self:0').setLabel('Ma collection').setEmoji('📚').setStyle(ButtonStyle.Primary),
    ),
  ];
}

async function handlePull(interaction, mode) {
  await interaction.deferUpdate();
  const result = await performGachaDraw({
    userId: interaction.user.id,
    guildId: interaction.guildId,
    mode,
  });
  if (!result.ok) {
    await interaction.followUp({ content: `❌ ${result.reason}`, flags: MessageFlags.Ephemeral });
    return interaction.editReply(await buildHomePayload(interaction));
  }

  const newCount = result.results.filter((entry) => entry.isNew).length;
  const duplicateCount = result.results.length - newCount;
  const attachment = await createGachaResultCanvas(result.results, {
    paymentLabel: result.paymentLabel,
    newCount,
    duplicateCount,
    fragmentsEarned: result.fragmentsEarned,
  });
  return interaction.editReply(createLargeCanvasPayload({
    attachment,
    content: `✨ Tirage terminé — ${newCount} nouvelle(s) carte(s), ${duplicateCount} doublon(s), +${result.fragmentsEarned} fragments.`,
    components: getResultRows(),
  }));
}

function sortCollection(entries) {
  return [...entries].sort((a, b) => {
    const rarityDiff = RARITY_ORDER.indexOf(b.card.rarity) - RARITY_ORDER.indexOf(a.card.rarity);
    return rarityDiff || a.card.name.localeCompare(b.card.name, 'fr');
  });
}

function getPaginationRow(prefix, page, totalPages, backId = 'gacha:home') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${prefix}:${Math.max(0, page - 1)}:previous`).setLabel('Précédente').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`${prefix}:${Math.min(totalPages - 1, page + 1)}:next`).setLabel('Suivante').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
    new ButtonBuilder().setCustomId(backId).setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  );
}

function getCardSelectRow(customId, cards, placeholder = 'Voir une carte en détail') {
  const options = cards.slice(0, 25).map((card) => new StringSelectMenuOptionBuilder()
    .setLabel(card.name.slice(0, 100))
    .setDescription(`${card.rarityLabel} — ${card.faction}`.slice(0, 100))
    .setValue(card.cardId));
  if (!options.length) return null;
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(options),
  );
}

async function showCollection(interaction, targetUserId = interaction.user.id, requestedPage = 0) {
  const userId = targetUserId === 'self' ? interaction.user.id : targetUserId;
  const [entries, account, user] = await Promise.all([
    getCollection(userId, interaction.guildId),
    getOrCreateGachaAccount(userId, interaction.guildId),
    interaction.client.users.fetch(userId).catch(() => null),
  ]);
  const sorted = sortCollection(entries);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(totalPages - 1, Number(requestedPage) || 0));
  const pageEntries = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const totalValue = sorted.reduce((sum, entry) => sum + Number(entry.card.value || 0), 0);
  const lines = pageEntries.length
    ? pageEntries.map((entry) => ({
      text: `${entry.card.emoji} ${entry.card.name} — ${entry.card.rarityLabel} — ${entry.card.value} pts${entry.copiesSeen > 1 ? ` — obtenue ×${entry.copiesSeen}` : ''}`,
      color: entry.card.color,
    }))
    : ['Cette collection est encore vide. Utilise `/gacha` pour obtenir ta première carte.'];
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-collection.png',
    variant: 'gacha',
    section: `Collection — ${user?.username || userId}`,
    title: `${sorted.length}/${FAIRY_TAIL_CARDS.length} cartes uniques`,
    subtitle: `Page ${page + 1}/${totalPages}`,
    stats: [
      { label: 'Uniques', value: `${sorted.length}/${FAIRY_TAIL_CARDS.length}` },
      { label: 'Valeur', value: `${formatNumber(totalValue)} pts` },
      { label: 'Fragments', value: formatNumber(account.fragments) },
      { label: 'Tirages', value: formatNumber(account.totalPulls) },
    ],
    lines,
    footer: 'Les doublons déjà obtenus sont comptabilisés dans chaque carte et convertis en fragments.',
  });
  const prefix = `gacha:collection:${userId}`;
  const selectRow = getCardSelectRow(
    `gacha:collection_select:${userId}:${page}`,
    pageEntries.map((entry) => entry.card),
    'Inspecter une carte possédée',
  );
  return respond(interaction, createLargeCanvasPayload({
    attachment,
    components: [selectRow, getPaginationRow(prefix, page, totalPages)].filter(Boolean),
  }));
}

function filterCatalog(search) {
  const query = normalizeText(search);
  const cards = query ? FAIRY_TAIL_CARDS.filter((card) => [
    card.name, card.characterName, card.title, card.rarityLabel, card.faction,
  ].some((value) => normalizeText(value).includes(query))) : FAIRY_TAIL_CARDS;
  return [...cards].sort((a, b) => (
    RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)
    || a.name.localeCompare(b.name, 'fr')
  ));
}

async function showCatalog(interaction, requestedPage = 0, search = '') {
  const cards = filterCatalog(search);
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(totalPages - 1, Number(requestedPage) || 0));
  const pageCards = cards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const lines = pageCards.length
    ? pageCards.map((card) => ({
      text: `${card.emoji} ${card.name} — ${card.rarityLabel} — ${card.faction}`,
      color: card.color,
    }))
    : [`Aucune carte trouvée pour « ${search} ».`];
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-cartes.png',
    variant: 'gacha',
    section: 'Catalogue des cartes',
    title: search ? `Recherche : ${search}` : `${FAIRY_TAIL_CARDS.length} cartes disponibles`,
    subtitle: `Page ${page + 1}/${totalPages} — tri Mythique → Commune.`,
    lines,
    footer: 'Raretés : Commune, Rare, Épique, Légendaire et Mythique.',
  });
  const encodedSearch = encodeSearch(search);
  const paginationRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gacha:catalog:${Math.max(0, page - 1)}:${encodedSearch}:previous`).setLabel('Précédente').setEmoji('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`gacha:catalog:${Math.min(totalPages - 1, page + 1)}:${encodedSearch}:next`).setLabel('Suivante').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(page >= totalPages - 1),
    new ButtonBuilder().setCustomId('gacha:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  );
  const selectRow = getCardSelectRow(`gacha:catalog_select:${page}:${encodedSearch}`, pageCards);
  return respond(interaction, createLargeCanvasPayload({
    attachment,
    components: [selectRow, paginationRow].filter(Boolean),
  }));
}

async function showCardDetail(interaction, cardId, backCustomId, ownership = null) {
  const card = getCardById(cardId);
  if (!card) {
    return interaction.reply({ content: 'Carte introuvable.', flags: MessageFlags.Ephemeral });
  }
  const statusLabel = ownership
    ? `POSSÉDÉE • ${ownership.copiesSeen || 1} exemplaire(s) obtenu(s)`
    : 'CATALOGUE FAIRY SLAYER';
  const attachment = await createGachaResultCanvas([
    { card, isNew: true, fragmentsEarned: 0, statusLabel },
  ], {
    paymentLabel: `${card.faction} — ${card.value} points de collection`,
    footerText: `${card.rarityLabel} • doublon : +${card.duplicateFragments} fragments`,
  });
  return respond(interaction, createLargeCanvasPayload({
    attachment,
    content: `**${card.name}** — ${card.description}\nID carte : \`${card.cardId}\` • ID personnage : \`${card.characterId}\``,
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(backCustomId).setLabel('Retour à la liste').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('gacha:home').setLabel('Portail gacha').setEmoji('✨').setStyle(ButtonStyle.Primary),
    )],
  }));
}

async function showGachaInfo(interaction) {
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-gacha-info.png',
    variant: 'gacha',
    section: 'Gacha — Probabilités',
    title: 'Règles des invocations',
    subtitle: 'Chaque tirage est indépendant, sauf lorsque le pity garantit une rareté minimale.',
    lines: [
      'Commune : 60 % — doublon converti en 5 fragments.',
      'Rare : 27 % — doublon converti en 15 fragments.',
      'Épique : 9 % — doublon converti en 50 fragments.',
      'Légendaire : 3,5 % — doublon converti en 150 fragments.',
      'Mythique : 0,5 % — doublon converti en 500 fragments.',
      'Pity : Épique au 10e tirage, Légendaire au 50e, Mythique au 100e.',
      `Coûts : ${FRAGMENT_SINGLE_COST} fragments l’unité ou ${FRAGMENT_TEN_COST} fragments les dix.`,
      'Les Joyaux du RP et de la boutique ne sont jamais débités.',
      'Une carte Épique ou supérieure remet aussi le pity Épique à zéro.',
    ],
    footer: 'Le pity est conservé entre les sessions et partagé par tous tes profils du serveur.',
  });
  return respond(interaction, createLargeCanvasPayload({
    attachment,
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('gacha:home').setLabel('Retour au gacha').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
    )],
  }));
}

async function handleGachaComponent(interaction) {
  const parts = interaction.customId.split(':');
  if (interaction.customId === 'gacha:home') return openGachaHub(interaction);
  if (interaction.customId === 'gacha:info') return showGachaInfo(interaction);
  if (parts[1] === 'pull') return handlePull(interaction, parts[2]);
  if (parts[1] === 'collection') return showCollection(interaction, parts[2], parts[3]);
  if (parts[1] === 'catalog') return showCatalog(interaction, parts[2], decodeSearch(parts[3]));
  if (parts[1] === 'catalog_select') {
    const cardId = interaction.values?.[0];
    return showCardDetail(interaction, cardId, `gacha:catalog:${parts[2]}:${parts[3]}`);
  }
  if (parts[1] === 'collection_select') {
    const userId = parts[2] === 'self' ? interaction.user.id : parts[2];
    const cardId = interaction.values?.[0];
    const ownership = await GachaCard.findOne({ userId, guildId: interaction.guildId, cardId }).lean();
    return showCardDetail(interaction, cardId, `gacha:collection:${userId}:${parts[3]}`, ownership);
  }
  return interaction.reply({ content: 'Interaction gacha inconnue.', flags: MessageFlags.Ephemeral });
}

module.exports = {
  openGachaHub,
  showCollection,
  showCatalog,
  showGachaInfo,
  handleGachaComponent,
};
