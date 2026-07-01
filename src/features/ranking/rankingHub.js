const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');

const Profile = require('../../models/Profile');
const ProfileMission = require('../../models/ProfileMission');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { formatNumber } = require('../../utils/format');
const { getProfilePowerWithEquipment } = require('../../utils/inventoryUtils');

function createCanvasEmbed(fileName) {
  return new EmbedBuilder()
    .setColor(0xffdf91)
    .setImage(`attachment://${fileName}`);
}

function getRankingRows(active = 'level') {
  const button = (id, label, emoji) => new ButtonBuilder()
    .setCustomId(`ranking:${id}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(active === id ? ButtonStyle.Primary : ButtonStyle.Secondary);

  return [
    new ActionRowBuilder().addComponents(
      button('level', 'Niveau RP', '🏆'),
      button('power', 'Puissance', '⚔️'),
      button('jewels', 'Richesse', '💎'),
      button('reputation', 'Réputation', '⭐'),
    ),

    new ActionRowBuilder().addComponents(
      button('missions', 'Missions', '📜'),
    ),
  ];
}

function medal(index) {
  return ['🥇', '🥈', '🥉'][index] || `#${index + 1}`;
}

async function getMissionRanking(guildId) {
  const rows = await ProfileMission.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: '$profileId', total: { $sum: 1 } } },
    { $sort: { total: -1 } },
    { $limit: 10 },
  ]);

  const profileIds = rows.map((row) => row._id);
  const profiles = await Profile.find({ _id: { $in: profileIds }, guildId });
  const byId = new Map(profiles.map((profile) => [String(profile._id), profile]));

  return rows
    .map((row) => ({
      profile: byId.get(String(row._id)),
      total: row.total,
    }))
    .filter((row) => row.profile);
}

async function getPowerRanking(guildId) {
  const profiles = await Profile.find({ guildId }).limit(200);

  const rows = await Promise.all(
    profiles.map(async (profile) => {
      const powerInfo = await getProfilePowerWithEquipment(profile);

      return {
        profile,
        basePower: Number(powerInfo.basePower || profile.powerLevel || 0),
        equipmentBonus: Number(powerInfo.equipmentBonus || 0),
        totalPower: Number(powerInfo.totalPower || profile.powerLevel || 0),
      };
    }),
  );

  return rows
    .sort((a, b) => {
      if (b.totalPower !== a.totalPower) return b.totalPower - a.totalPower;
      if (b.equipmentBonus !== a.equipmentBonus) return b.equipmentBonus - a.equipmentBonus;
      return Number(b.profile.level || 1) - Number(a.profile.level || 1);
    })
    .slice(0, 10);
}

async function buildRankingPayload(guildId, type = 'level') {
  let title = 'Classement niveau RP';
  let subtitle = 'Classements par personnage RP, pas seulement par compte Discord.';
  let lines = [];

  if (type === 'missions') {
    title = 'Classement missions terminées';

    const rows = await getMissionRanking(guildId);

    lines = rows.map((row, index) => (
      `${medal(index)} ${row.profile.characterName} — ${formatNumber(row.total)} mission(s)`
    ));
  } else if (type === 'power') {
    title = 'Classement puissance totale';
    subtitle = 'La puissance totale inclut la puissance de base et les bonus des objets équipés.';

    const rows = await getPowerRanking(guildId);

    lines = rows.map((row, index) => {
      const bonusText = row.equipmentBonus > 0
        ? ` · Base ${formatNumber(row.basePower)} + équipement ${formatNumber(row.equipmentBonus)}`
        : ` · Base ${formatNumber(row.basePower)}`;

      return `${medal(index)} ${row.profile.characterName} — ${formatNumber(row.totalPower)} puissance${bonusText} · Rang ${row.profile.mageRank}`;
    });
  } else {
    const sortMap = {
      level: { level: -1, xp: -1 },
      jewels: { jewels: -1 },
      reputation: { reputation: -1 },
    };

    const labelMap = {
      level: (profile) => `Niveau ${profile.level} · ${formatNumber(profile.xp)} XP`,
      jewels: (profile) => `${formatNumber(profile.jewels)} Jewels`,
      reputation: (profile) => `${profile.reputation} réputation`,
    };

    const titleMap = {
      level: 'Classement niveau RP',
      jewels: 'Classement richesse',
      reputation: 'Classement réputation',
    };

    const rows = await Profile.find({ guildId })
      .sort(sortMap[type] || sortMap.level)
      .limit(10);

    title = titleMap[type] || title;
    lines = rows.map((profile, index) => (
      `${medal(index)} ${profile.characterName} — ${labelMap[type]?.(profile) || labelMap.level(profile)}`
    ));
  }

  const fileName = 'fairy-slayer-classement.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'ranking',
    section: 'Classement',
    title,
    subtitle,
    lines: lines.length ? lines : ['Aucun résultat pour l’instant.'],
    footer: 'Utilise les boutons sous le Canvas pour changer de classement.',
  });

  return {
    embeds: [createCanvasEmbed(fileName)],
    components: getRankingRows(type),
    files: [attachment],
  };
}

async function openRankingHub(interaction) {
  await interaction.deferReply();
  return interaction.editReply(await buildRankingPayload(interaction.guildId, 'level'));
}

async function handleRankingComponent(interaction) {
  const type = interaction.customId.replace('ranking:', '');

  await interaction.deferUpdate();
  return interaction.editReply(await buildRankingPayload(interaction.guildId, type));
}

module.exports = {
  openRankingHub,
  handleRankingComponent,
};