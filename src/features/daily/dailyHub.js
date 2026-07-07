const DailyState = require('../../models/DailyState');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { formatNumber } = require('../../utils/format');
const { addFragments, removeFragments, formatRemainingTime } = require('../../utils/gacha');

const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const DAILY_EVENTS = {
  expedition: [
    ['Forêt de l’Est', 'Tu aides une caravane encerclée par des créatures magiques.', 35, 70],
    ['Ruines de Magnolia', 'Une vieille cache de guilde révèle quelques fragments intacts.', 30, 65],
    ['Mont Hakobe', 'Tu ramènes un voyageur perdu malgré la tempête de neige.', 45, 85],
    ['Île de Galuna', 'Une reconnaissance prudente te mène vers un ancien artefact.', 55, 95],
  ],
  enquete: [
    ['Lacrima disparue', 'Tes recherches démasquent le receleur d’une lacrima volée.', 40, 80],
    ['Rumeur de guilde noire', 'Tu remontes une piste dangereuse sans alerter les suspects.', 50, 95],
    ['Archives du Conseil', 'Un dossier oublié contient une information particulièrement précieuse.', 45, 90],
    ['Sabotage magique', 'Tu identifies le sort responsable avant qu’il ne frappe de nouveau.', 60, 110],
  ],
  raid: [
    ['Convoi clandestin', 'Tu attaques un convoi protégé par des mages renégats.', 90, 180, 30, 30],
    ['Repaire de guilde noire', 'Tu t’introduis au cœur d’un repaire lourdement défendu.', 120, 230, 40, 45],
    ['Trésor maudit', 'Tu tentes de récupérer un coffre dont la magie attire les ennuis.', 100, 210, 35, 40],
    ['Lacrima interdite', 'Tu risques tout pour saisir une lacrima avant son activation.', 140, 260, 45, 60],
  ],
};

const DAILY_LABELS = {
  expedition: 'Expédition',
  enquete: 'Enquête',
  raid: 'Raid risqué',
};

function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

async function claimDaily(userId, guildId, type) {
  const state = await DailyState.findOneAndUpdate(
    { userId, guildId },
    { $setOnInsert: { userId, guildId } },
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
  );
  const now = new Date();
  const claimed = await DailyState.findOneAndUpdate(
    { _id: state._id, $or: [{ availableAt: null }, { availableAt: { $lte: now } }] },
    { $set: { lastType: type, availableAt: new Date(now.getTime() + DAILY_COOLDOWN_MS) } },
    { returnDocument: 'after' },
  );
  return { claimed, state };
}

async function runDaily(interaction, type, rng = Math.random) {
  await interaction.deferReply();
  if (!DAILY_EVENTS[type]) return interaction.editReply({ content: 'Activité quotidienne inconnue.' });
  const cooldown = await claimDaily(interaction.user.id, interaction.guildId, type);
  if (!cooldown.claimed) {
    const remaining = Math.max(0, new Date(cooldown.state.availableAt).getTime() - Date.now());
    return interaction.editReply({ content: `⏳ Ton daily est déjà utilisé. Reviens dans **${formatRemainingTime(remaining)}**.` });
  }

  const events = DAILY_EVENTS[type];
  const event = events[Math.floor(rng() * events.length)];
  const [title, description, minReward, maxReward, failChance = 0, failPenalty = 0] = event;
  const failed = failChance > 0 && randomInt(1, 100, rng) <= failChance;
  let delta;
  let account;
  let outcome;
  if (failed) {
    const removal = await removeFragments(interaction.user.id, interaction.guildId, failPenalty);
    delta = -removal.removed;
    account = removal.account;
    outcome = `Le raid échoue : tu perds ${removal.removed} fragments.`;
  } else {
    const reward = randomInt(minReward, maxReward, rng);
    account = await addFragments(interaction.user.id, interaction.guildId, reward);
    delta = reward;
    outcome = `Réussite : tu gagnes ${reward} fragments.`;
  }

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-daily.png',
    variant: 'daily',
    section: `Daily — ${DAILY_LABELS[type]}`,
    title,
    subtitle: failed ? 'La prise de risque ne paie pas cette fois.' : 'Une nouvelle récompense rejoint ton compte gacha.',
    stats: [
      { label: 'Résultat', value: delta >= 0 ? `+${delta}` : String(delta) },
      { label: 'Fragments', value: formatNumber(account.fragments) },
      { label: 'Prochain daily', value: '24 heures' },
    ],
    lines: [description, outcome, 'Les Joyaux RP ne sont jamais affectés par le daily.'],
    footer: 'Choisis prudemment : le Raid rapporte davantage, mais peut faire perdre des fragments.',
  });
  return interaction.editReply(createLargeCanvasPayload({ attachment }));
}

module.exports = { DAILY_COOLDOWN_MS, DAILY_EVENTS, randomInt, runDaily };
