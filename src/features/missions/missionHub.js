const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} = require('discord.js');

const Profile = require('../../models/Profile');
const ProfileMission = require('../../models/ProfileMission');
const ReputationLog = require('../../models/ReputationLog');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getActiveProfile } = require('../../utils/activeProfile');
const { formatNumber, truncateText } = require('../../utils/format');
const { applyXp } = require('../../utils/xp');
const { clampReputation } = require('../../utils/reputation');

const {
  addItemToInventory,
  getProfilePowerWithEquipment,
} = require('../../utils/inventoryUtils');

const {
  getAvailableMissions,
  getMissionById,
  getMissionRewardText,
  canProfileAccessMission,
} = require('../../data/missions');

function createCanvasEmbed(fileName, color = 0xffd166) {
  return new EmbedBuilder()
    .setColor(color)
    .setImage(`attachment://${fileName}`);
}

function hasStaffPermission(interaction) {
  return interaction.memberPermissions?.has('ManageGuild')
    || interaction.memberPermissions?.has('Administrator');
}

function getMissionStatusLabel(status) {
  const labels = {
    active: 'En cours',
    pending_validation: 'En attente de validation',
    completed: 'Terminée',
    failed: 'Refusée',
    cancelled: 'Annulée',
  };

  return labels[status] || status;
}

async function respondCanvas(interaction, payload) {
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }

  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    await interaction.deferUpdate();
    return interaction.editReply(payload);
  }

  return interaction.reply(payload);
}

async function getMissionCounts(profileId) {
  const [active, pending, completed, failed] = await Promise.all([
    ProfileMission.countDocuments({ profileId, status: 'active' }),
    ProfileMission.countDocuments({ profileId, status: 'pending_validation' }),
    ProfileMission.countDocuments({ profileId, status: 'completed' }),
    ProfileMission.countDocuments({ profileId, status: 'failed' }),
  ]);

  return {
    active,
    pending,
    completed,
    failed,
  };
}

function getMissionBoardRows(missions) {
  const options = missions.slice(0, 25).map((mission) => (
    new StringSelectMenuOptionBuilder()
      .setLabel(mission.title.slice(0, 100))
      .setDescription(`Rang ${mission.rank} · ${mission.requiredPowerLevel} puissance · ${getMissionRewardText(mission)}`.slice(0, 100))
      .setValue(mission.missionId)
  ));

  const rows = [];

  if (options.length) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('mission:select')
          .setPlaceholder('Voir le détail d’une mission')
          .addOptions(options),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mission:board')
        .setLabel('Tableau')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId('mission:active')
        .setLabel('Mes missions')
        .setEmoji('🧭')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour profil')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

function getMissionDetailRows(mission, existingStatus = null) {
  const buttons = [];

  if (!existingStatus) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mission:accept:${mission.missionId}`)
        .setLabel('Accepter')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId('mission:board')
      .setLabel('Retour tableau')
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary),
  );

  buttons.push(
    new ButtonBuilder()
      .setCustomId('mission:active')
      .setLabel('Mes missions')
      .setEmoji('🧭')
      .setStyle(ButtonStyle.Secondary),
  );

  return [
    new ActionRowBuilder().addComponents(buttons),
  ];
}

function getActiveMissionRows(profileMissions) {
  const rows = [];

  const activeOrPending = profileMissions.filter((entry) => (
    entry.status === 'active' || entry.status === 'pending_validation'
  ));

  for (const entry of activeOrPending.slice(0, 3)) {
    const mission = getMissionById(entry.missionId);

    if (!mission) continue;

    const buttons = [];

    if (entry.status === 'active') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mission:submit:${entry._id}`)
          .setLabel(`Soumettre : ${truncateText(mission.title, 30)}`)
          .setEmoji('📨')
          .setStyle(ButtonStyle.Success),
      );
    }

    if (entry.status === 'pending_validation') {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mission:validate:${entry._id}`)
          .setLabel('Valider staff')
          .setEmoji('✅')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`mission:fail:${entry._id}`)
          .setLabel('Refuser staff')
          .setEmoji('❌')
          .setStyle(ButtonStyle.Danger),
      );
    }

    if (buttons.length) {
      rows.push(new ActionRowBuilder().addComponents(buttons));
    }
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mission:board')
        .setLabel('Tableau missions')
        .setEmoji('📜')
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour profil')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

async function showMissionBoard(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const missions = getAvailableMissions();
  const powerInfo = await getProfilePowerWithEquipment(profile);
  const counts = await getMissionCounts(profile._id);

  const lines = missions.slice(0, 8).map((mission) => {
    const access = canProfileAccessMission(profile, mission, powerInfo.totalPower);
    const status = access.allowed ? 'Accessible' : `Bloquée : ${access.reason}`;

    return `${mission.title} — Rang ${mission.rank} · ${formatNumber(mission.requiredPowerLevel)} puissance · ${getMissionRewardText(mission)} · ${status}`;
  });

  const fileName = 'fairy-slayer-missions.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: `Missions — ${profile.characterName}`,
    title: 'Tableau des missions',
    subtitle: 'Choisis une mission dans le menu déroulant pour voir les détails.',
    stats: [
      { label: 'Puissance', value: formatNumber(powerInfo.totalPower) },
      { label: 'En cours', value: formatNumber(counts.active) },
      { label: 'En attente', value: formatNumber(counts.pending) },
      { label: 'Terminées', value: formatNumber(counts.completed) },
    ],
    lines,
    footer: 'Menu /profil - Missions',
  });

  return respondCanvas(interaction, {
    embeds: [createCanvasEmbed(fileName)],
    components: getMissionBoardRows(missions),
    files: [attachment],
  });
}

async function showMissionDetails(interaction, missionId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const mission = getMissionById(missionId);

  if (!mission) {
    return interaction.reply({
      content: 'Mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const powerInfo = await getProfilePowerWithEquipment(profile);
  const access = canProfileAccessMission(profile, mission, powerInfo.totalPower);

  const existing = await ProfileMission.findOne({
    profileId: profile._id,
    missionId: mission.missionId,
    status: { $in: ['active', 'pending_validation', 'completed'] },
  }).sort({ updatedAt: -1 });

  const existingStatus = existing ? existing.status : null;

  const lines = [
    `Description : ${mission.description}`,
    `Objectifs : ${mission.objectives.join(' / ')}`,
    `Rang : ${mission.rank}`,
    `Puissance requise : ${formatNumber(mission.requiredPowerLevel)}`,
    `Récompenses : ${getMissionRewardText(mission)}`,
    `Accès : ${access.allowed ? 'Accessible' : access.reason}`,
    existingStatus
      ? `Statut actuel : ${getMissionStatusLabel(existingStatus)}`
      : 'Statut actuel : non acceptée',
  ];

  const fileName = 'fairy-slayer-mission-detail.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: `Mission — ${profile.characterName}`,
    title: mission.title,
    subtitle: mission.description,
    stats: [
      { label: 'Rang', value: mission.rank },
      { label: 'Puissance', value: formatNumber(mission.requiredPowerLevel) },
      { label: 'XP', value: formatNumber(mission.rewards.xp || 0) },
      { label: 'Joyaux', value: formatNumber(mission.rewards.jewels || 0) },
    ],
    lines,
    footer: 'Accepte la mission si ton personnage remplit les conditions.',
  });

  return respondCanvas(interaction, {
    embeds: [createCanvasEmbed(fileName)],
    components: getMissionDetailRows(mission, existingStatus),
    files: [attachment],
  });
}

async function showActiveMissions(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const profileMissions = await ProfileMission.find({ profileId: profile._id })
    .sort({ updatedAt: -1 })
    .limit(10);

  const lines = profileMissions.length
    ? profileMissions.map((entry) => {
      const mission = getMissionById(entry.missionId);
      return `${mission?.title || entry.missionId} — ${getMissionStatusLabel(entry.status)}`;
    })
    : ['Aucune mission acceptée pour ce personnage.'];

  const counts = await getMissionCounts(profile._id);

  const fileName = 'fairy-slayer-missions-actives.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: `Mes missions — ${profile.characterName}`,
    title: 'Suivi des missions',
    subtitle: 'Soumets une mission terminée pour demander une validation staff.',
    stats: [
      { label: 'En cours', value: formatNumber(counts.active) },
      { label: 'En attente', value: formatNumber(counts.pending) },
      { label: 'Terminées', value: formatNumber(counts.completed) },
      { label: 'Refusées', value: formatNumber(counts.failed) },
    ],
    lines,
    footer: 'Les boutons staff apparaissent sur les missions en attente de validation.',
  });

  return respondCanvas(interaction, {
    embeds: [createCanvasEmbed(fileName)],
    components: getActiveMissionRows(profileMissions),
    files: [attachment],
  });
}

async function acceptMission(interaction, missionId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const mission = getMissionById(missionId);

  if (!mission) {
    return interaction.reply({
      content: 'Mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const powerInfo = await getProfilePowerWithEquipment(profile);
  const access = canProfileAccessMission(profile, mission, powerInfo.totalPower);

  if (!access.allowed) {
    return interaction.reply({
      content: `Tu ne peux pas accepter cette mission : ${access.reason}.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const existing = await ProfileMission.findOne({
    profileId: profile._id,
    missionId: mission.missionId,
    status: { $in: ['active', 'pending_validation', 'completed'] },
  });

  if (existing) {
    return interaction.reply({
      content: `Cette mission est déjà au statut : **${getMissionStatusLabel(existing.status)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const activeCount = await ProfileMission.countDocuments({
    profileId: profile._id,
    status: 'active',
  });

  if (activeCount >= 3) {
    return interaction.reply({
      content: 'Tu as déjà 3 missions actives. Termine ou soumets une mission avant d’en accepter une autre.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await ProfileMission.create({
    profileId: profile._id,
    missionId: mission.missionId,
    status: 'active',
    startedAt: new Date(),
  });

  return showActiveMissions(interaction);
}

async function submitMission(interaction, profileMissionId) {
  const entry = await ProfileMission.findById(profileMissionId);

  if (!entry) {
    return interaction.reply({
      content: 'Mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const profile = await Profile.findById(entry.profileId);

  if (!profile || profile.userId !== interaction.user.id || profile.guildId !== interaction.guildId) {
    return interaction.reply({
      content: 'Tu ne peux soumettre que les missions de ton personnage actif.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (entry.status !== 'active') {
    return interaction.reply({
      content: `Cette mission ne peut pas être soumise. Statut actuel : **${getMissionStatusLabel(entry.status)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  entry.status = 'pending_validation';
  entry.submittedAt = new Date();

  await entry.save();

  return showActiveMissions(interaction);
}

async function applyMissionRewards(profile, mission, interaction) {
  const rewards = mission.rewards || {};

  if (Number(rewards.xp || 0) > 0) {
    applyXp(profile, Number(rewards.xp || 0));
  }

  if (Number(rewards.jewels || 0) > 0) {
    profile.jewels = Number(profile.jewels || 0) + Number(rewards.jewels || 0);
  }

  if (Number(rewards.reputation || 0) !== 0) {
    profile.reputation = clampReputation(
      Number(profile.reputation || 0) + Number(rewards.reputation || 0),
    );

    await ReputationLog.create({
      profileId: profile._id,
      amount: Number(rewards.reputation || 0),
      reason: `Mission validée : ${mission.title}`,
      source: 'mission',
      createdBy: interaction.user.id,
    });
  }

  for (const itemId of rewards.items || []) {
    await addItemToInventory(profile._id, itemId, 1);
  }

  await profile.save();
}

async function validateMission(interaction, profileMissionId) {
  if (!hasStaffPermission(interaction)) {
    return interaction.reply({
      content: 'Seul le staff peut valider une mission.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const entry = await ProfileMission.findById(profileMissionId);

  if (!entry) {
    return interaction.reply({
      content: 'Mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (entry.status !== 'pending_validation') {
    return interaction.reply({
      content: `Cette mission n’est pas en attente de validation. Statut actuel : **${getMissionStatusLabel(entry.status)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const profile = await Profile.findById(entry.profileId);
  const mission = getMissionById(entry.missionId);

  if (!profile || !mission) {
    return interaction.reply({
      content: 'Profil ou mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await applyMissionRewards(profile, mission, interaction);

  entry.status = 'completed';
  entry.completedAt = new Date();
  entry.reviewedAt = new Date();
  entry.reviewedBy = interaction.user.id;

  await entry.save();

  const lines = [
    `Mission validée : ${mission.title}`,
    `Personnage : ${profile.characterName}`,
    `Récompenses : ${getMissionRewardText(mission)}`,
    `Validée par : ${interaction.user.tag}`,
  ];

  const fileName = 'fairy-slayer-mission-validee.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: 'Mission validée',
    title: mission.title,
    subtitle: 'Les récompenses ont été appliquées au personnage.',
    stats: [
      { label: 'XP', value: formatNumber(mission.rewards.xp || 0) },
      { label: 'Joyaux', value: formatNumber(mission.rewards.jewels || 0) },
      { label: 'Réputation', value: `${mission.rewards.reputation > 0 ? '+' : ''}${mission.rewards.reputation || 0}` },
      { label: 'Objets', value: formatNumber(mission.rewards.items?.length || 0) },
    ],
    lines,
    footer: 'Validation staff enregistrée.',
  });

  return respondCanvas(interaction, {
    embeds: [createCanvasEmbed(fileName, 0x57f287)],
    components: getMissionBoardRows(getAvailableMissions()),
    files: [attachment],
  });
}

async function failMission(interaction, profileMissionId) {
  if (!hasStaffPermission(interaction)) {
    return interaction.reply({
      content: 'Seul le staff peut refuser une mission.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const entry = await ProfileMission.findById(profileMissionId);

  if (!entry) {
    return interaction.reply({
      content: 'Mission introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (entry.status !== 'pending_validation') {
    return interaction.reply({
      content: `Cette mission n’est pas en attente de validation. Statut actuel : **${getMissionStatusLabel(entry.status)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const profile = await Profile.findById(entry.profileId);
  const mission = getMissionById(entry.missionId);

  entry.status = 'failed';
  entry.reviewedAt = new Date();
  entry.reviewedBy = interaction.user.id;

  await entry.save();

  const fileName = 'fairy-slayer-mission-refusee.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'missions',
    section: 'Mission refusée',
    title: mission?.title || entry.missionId,
    subtitle: 'La mission a été refusée par le staff.',
    lines: [
      `Personnage : ${profile?.characterName || 'Profil inconnu'}`,
      `Mission : ${mission?.title || entry.missionId}`,
      `Refusée par : ${interaction.user.tag}`,
      'Aucune récompense n’a été appliquée.',
    ],
    footer: 'Validation staff enregistrée.',
  });

  return respondCanvas(interaction, {
    embeds: [createCanvasEmbed(fileName, 0xed4245)],
    components: getMissionBoardRows(getAvailableMissions()),
    files: [attachment],
  });
}

async function handleMissionComponent(interaction) {
  const id = interaction.customId;

  if (id === 'mission:board') return showMissionBoard(interaction);
  if (id === 'mission:active') return showActiveMissions(interaction);

  if (id === 'mission:select') {
    return showMissionDetails(interaction, interaction.values[0]);
  }

  if (id.startsWith('mission:accept:')) {
    return acceptMission(interaction, id.replace('mission:accept:', ''));
  }

  if (id.startsWith('mission:submit:')) {
    return submitMission(interaction, id.replace('mission:submit:', ''));
  }

  if (id.startsWith('mission:validate:')) {
    return validateMission(interaction, id.replace('mission:validate:', ''));
  }

  if (id.startsWith('mission:fail:')) {
    return failMission(interaction, id.replace('mission:fail:', ''));
  }

  return interaction.reply({
    content: 'Interaction mission inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  showMissionBoard,
  showActiveMissions,
  handleMissionComponent,
};