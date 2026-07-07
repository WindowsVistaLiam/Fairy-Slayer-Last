const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

const GuildInvite = require('../../models/GuildInvite');
const GuildApplication = require('../../models/GuildApplication');
const GuildMember = require('../../models/GuildMember');
const GuildRank = require('../../models/GuildRank');
const MageGuild = require('../../models/MageGuild');
const Profile = require('../../models/Profile');
const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getActiveProfile } = require('../../utils/activeProfile');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');
const { truncateText } = require('../../utils/format');
const { sendGuildLog } = require('../../utils/guildConfig');
const { getProfilePowerWithEquipment } = require('../../utils/inventoryUtils');

function normalizeName(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseBoolean(value) {
  return ['oui', 'o', 'yes', 'y', 'true', '1'].includes(normalizeName(value));
}

function parsePriority(value) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed));
}

async function replyError(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

async function respondCanvas(interaction, payload) {
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  if (interaction.isButton?.() || interaction.isStringSelectMenu?.()) {
    await interaction.deferUpdate();
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

async function findProfileByName(guildId, characterName) {
  return Profile.findOne({
    guildId,
    characterName: { $regex: `^${escapeRegex(characterName.trim())}$`, $options: 'i' },
  });
}

async function getGuildContext(profile) {
  const membership = await GuildMember.findOne({
    guildId: profile.guildId,
    profileId: profile._id,
  });

  if (!membership) return { membership: null, mageGuild: null, rank: null, isOwner: false };

  const [mageGuild, rank] = await Promise.all([
    MageGuild.findById(membership.mageGuildId),
    membership.rankId ? GuildRank.findById(membership.rankId) : null,
  ]);

  if (!mageGuild) {
    await membership.deleteOne();
    return { membership: null, mageGuild: null, rank: null, isOwner: false };
  }

  return {
    membership,
    mageGuild,
    rank,
    isOwner: String(mageGuild?.ownerProfileId) === String(profile._id),
  };
}

function canManageMembers(context) {
  return context.isOwner || Boolean(context.rank?.canManageMembers);
}

function canManageRanks(context) {
  return context.isOwner || Boolean(context.rank?.canManageRanks);
}

function outranks(context, targetRank) {
  if (context.isOwner) return true;
  return Number(context.rank?.priority || 0) > Number(targetRank?.priority || 0);
}

function modalText(id, label, options = {}) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(options.style || TextInputStyle.Short)
    .setRequired(options.required !== false)
    .setMaxLength(options.maxLength || 80);

  if (options.placeholder) input.setPlaceholder(options.placeholder);
  if (options.value) input.setValue(options.value);
  return new ActionRowBuilder().addComponents(input);
}

function homeRows(context, invites = []) {
  if (!context.membership) {
    const rows = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('guild:create')
          .setLabel('Créer une guilde')
          .setEmoji('✨')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('guild:browse')
          .setLabel('Voir les guildes')
          .setEmoji('🔎')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('guild:ranking')
          .setLabel('Classement')
          .setEmoji('🏆')
          .setStyle(ButtonStyle.Secondary),
      ),
    ];

    if (invites.length) {
      rows.unshift(new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('guild:invite:select')
          .setPlaceholder('Consulter une invitation')
          .addOptions(invites.slice(0, 25).map((invite) => (
            new StringSelectMenuOptionBuilder()
              .setLabel(truncateText(invite.mageGuildId?.name || 'Guilde inconnue', 100))
              .setEmoji('📨')
              .setDescription('Invitation en attente')
              .setValue(String(invite._id))
          ))),
      ));
    }

    return rows;
  }

  const buttons = [
    new ButtonBuilder().setCustomId('guild:members').setLabel('Membres').setEmoji('👥').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('guild:ranks').setLabel('Rangs').setEmoji('🏷️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('guild:ranking').setLabel('Classement').setEmoji('🏆').setStyle(ButtonStyle.Secondary),
  ];

  if (canManageMembers(context)) {
    buttons.push(new ButtonBuilder().setCustomId('guild:applications').setLabel('Candidatures').setEmoji('📨').setStyle(ButtonStyle.Success));
  }

  const actionButtons = [];
  if (canManageMembers(context)) {
    actionButtons.push(new ButtonBuilder().setCustomId('guild:invite').setLabel('Inviter').setEmoji('➕').setStyle(ButtonStyle.Success));
  }
  actionButtons.push(new ButtonBuilder()
      .setCustomId(context.isOwner ? 'guild:disband' : 'guild:leave')
      .setLabel(context.isOwner ? 'Dissoudre' : 'Quitter')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Danger));
  return [new ActionRowBuilder().addComponents(buttons), new ActionRowBuilder().addComponents(actionButtons)];
}

async function openGuildHub(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Tu dois d’abord créer un personnage actif avec `/profil`.');

  const context = await getGuildContext(profile);
  const invites = context.membership ? [] : await GuildInvite.find({
    guildId: interaction.guildId,
    profileId: profile._id,
  }).populate('mageGuildId').sort({ createdAt: -1 }).limit(25);

  let memberCount = 0;
  let rankCount = 0;
  if (context.mageGuild) {
    [memberCount, rankCount] = await Promise.all([
      GuildMember.countDocuments({ mageGuildId: context.mageGuild._id }),
      GuildRank.countDocuments({ mageGuildId: context.mageGuild._id }),
    ]);
  }

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guilde.png',
    variant: 'guild',
    section: context.mageGuild ? `Guilde - ${context.mageGuild.name}` : 'Guildes de mages',
    title: context.mageGuild ? profile.characterName : 'Fonde ta propre histoire',
    subtitle: context.mageGuild
      ? (context.isOwner ? 'Maître de guilde' : `Rang : ${context.rank?.name || 'Membre'}`)
      : `${invites.length} invitation(s) en attente`,
    stats: context.mageGuild ? [
      { label: 'Membres', value: String(memberCount) },
      { label: 'Rangs', value: String(rankCount) },
      { label: 'Ton rang', value: context.isOwner ? 'Maître' : (context.rank?.name || 'Membre') },
      { label: 'Fondation', value: context.mageGuild.createdAt.toLocaleDateString('fr-FR') },
    ] : [
      { label: 'Personnage', value: profile.characterName },
      { label: 'Invitations', value: String(invites.length) },
    ],
    lines: context.mageGuild
      ? [context.mageGuild.description, 'Consulte les membres et les rangs, ou utilise les actions de gestion.']
      : invites.length
        ? invites.map((invite) => `Invitation de ${invite.mageGuildId?.name || 'guilde inconnue'}`)
        : ['Tu n’appartiens à aucune guilde.', 'Tu peux en créer une et inviter d’autres personnages.'],
    footer: 'Commande /guilde',
  });

  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: homeRows(context, invites),
  }));
}

function showCreateModal(interaction) {
  const modal = new ModalBuilder().setCustomId('guild:create:modal').setTitle('Créer une guilde');
  modal.addComponents(
    modalText('name', 'Nom de la guilde', { maxLength: 80, placeholder: 'Exemple : Fairy Tail' }),
    modalText('description', 'Description', { style: TextInputStyle.Paragraph, maxLength: 500, required: false }),
  );
  return interaction.showModal(modal);
}

async function handleCreateModal(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  if ((await getGuildContext(profile)).membership) return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');

  const name = interaction.fields.getTextInputValue('name').trim();
  const description = interaction.fields.getTextInputValue('description').trim() || 'Aucune description.';
  if (name.length < 2) return replyError(interaction, 'Le nom doit contenir au moins 2 caractères.');

  let mageGuild;
  try {
    mageGuild = await MageGuild.create({
      guildId: interaction.guildId,
      name,
      nameKey: normalizeName(name),
      description,
      ownerProfileId: profile._id,
    });
    await GuildMember.create({
      guildId: interaction.guildId,
      mageGuildId: mageGuild._id,
      profileId: profile._id,
    });
  } catch (error) {
    if (mageGuild) await MageGuild.deleteOne({ _id: mageGuild._id });
    if (error?.code === 11000) return replyError(interaction, 'Ce nom est déjà utilisé, ou ton personnage possède déjà une guilde.');
    throw error;
  }

  await Profile.updateOne({ _id: profile._id }, { $set: { guildName: mageGuild.name } });
  await sendGuildLog(interaction.guild, 'Guilde créée', [
    `Guilde : **${mageGuild.name}**`,
    `Maître : **${profile.characterName}**`,
  ], 0x64d2a6);
  await interaction.reply({ content: `✅ **${mageGuild.name}** a été créée.`, flags: MessageFlags.Ephemeral });
  return null;
}

async function requireGuildPermission(interaction, permission) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return { error: 'Aucun personnage actif.' };
  const context = await getGuildContext(profile);
  if (!context.mageGuild) return { error: 'Ton personnage n’appartient à aucune guilde.' };
  if (permission === 'members' && !canManageMembers(context)) return { error: 'Ton rang ne permet pas de gérer les membres.' };
  if (permission === 'ranks' && !canManageRanks(context)) return { error: 'Ton rang ne permet pas de gérer les rangs.' };
  if (permission === 'owner' && !context.isOwner) return { error: 'Seul le maître de guilde peut faire cela.' };
  return { profile, context };
}

async function showMembers(interaction) {
  const state = await requireGuildPermission(interaction);
  if (state.error) return replyError(interaction, state.error);

  const members = await GuildMember.find({ mageGuildId: state.context.mageGuild._id })
    .populate('profileId').populate('rankId').sort({ joinedAt: 1 }).limit(100);
  const lines = members.map((member) => {
    const owner = String(member.profileId?._id) === String(state.context.mageGuild.ownerProfileId);
    return `${member.profileId?.characterName || 'Profil supprimé'} - ${owner ? 'Maître' : (member.rankId?.name || 'Membre')}`;
  });

  const buttons = [];
  if (canManageMembers(state.context)) {
    buttons.push(
      new ButtonBuilder().setCustomId('guild:kick').setLabel('Exclure').setEmoji('➖').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('guild:assign').setLabel('Attribuer un rang').setEmoji('🏷️').setStyle(ButtonStyle.Primary),
    );
  }
  buttons.push(new ButtonBuilder().setCustomId('guild:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary));

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guilde-membres.png', variant: 'guild',
    section: `${state.context.mageGuild.name} - Membres`, title: `${members.length} membre(s)`,
    subtitle: 'Les permissions dépendent du rang attribué.', lines, footer: 'Guilde - Membres',
  });
  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: [new ActionRowBuilder().addComponents(buttons)],
  }));
}

async function showRanks(interaction) {
  const state = await requireGuildPermission(interaction);
  if (state.error) return replyError(interaction, state.error);
  const ranks = await GuildRank.find({ mageGuildId: state.context.mageGuild._id }).sort({ priority: -1, name: 1 });
  const lines = ranks.length ? ranks.map((rank) => {
    const permissions = [rank.canManageMembers && 'membres', rank.canManageRanks && 'rangs'].filter(Boolean).join(', ') || 'aucune gestion';
    return `${rank.name} - priorité ${rank.priority} - ${permissions}`;
  }) : ['Aucun rang personnalisé. Les membres sans rang restent de simples membres.'];

  const buttons = [];
  if (canManageRanks(state.context)) {
    buttons.push(
      new ButtonBuilder().setCustomId('guild:rank:create').setLabel('Créer').setEmoji('➕').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('guild:rank:delete').setLabel('Supprimer').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
    );
  }
  buttons.push(new ButtonBuilder().setCustomId('guild:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary));

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guilde-rangs.png', variant: 'guild',
    section: `${state.context.mageGuild.name} - Rangs`, title: `${ranks.length} rang(s)`,
    subtitle: 'Un rang peut déléguer la gestion des membres ou des rangs.', lines, footer: 'Guilde - Rangs',
  });
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components: [new ActionRowBuilder().addComponents(buttons)] }));
}

async function showInviteModal(interaction) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const modal = new ModalBuilder().setCustomId('guild:invite:modal').setTitle('Inviter un personnage');
  modal.addComponents(modalText('characterName', 'Nom exact du personnage', { placeholder: 'Exemple : Lucy Heartfilia' }));
  return interaction.showModal(modal);
}

async function handleInviteModal(interaction) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const characterName = interaction.fields.getTextInputValue('characterName').trim();
  const target = await findProfileByName(interaction.guildId, characterName);
  if (!target) return replyError(interaction, `Aucun personnage nommé **${truncateText(characterName, 80)}**.`);
  if (await GuildMember.exists({ guildId: interaction.guildId, profileId: target._id })) {
    return replyError(interaction, 'Ce personnage appartient déjà à une guilde.');
  }

  try {
    await GuildInvite.findOneAndUpdate(
      { mageGuildId: state.context.mageGuild._id, profileId: target._id },
      { $set: { guildId: interaction.guildId, invitedByProfileId: state.profile._id } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error?.code === 11000) return replyError(interaction, 'Cette invitation existe déjà.');
    throw error;
  }

  await sendGuildLog(interaction.guild, 'Invitation de guilde', [
    `Guilde : **${state.context.mageGuild.name}**`, `Invité : **${target.characterName}**`, `Par : **${state.profile.characterName}**`,
  ], 0x64d2a6);
  return interaction.reply({ content: `✅ **${target.characterName}** a été invité(e).`, flags: MessageFlags.Ephemeral });
}

async function showGuildBrowser(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  if ((await getGuildContext(profile)).membership) return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');

  const guilds = await MageGuild.find({ guildId: interaction.guildId }).sort({ createdAt: 1 }).limit(25);
  const counts = await GuildMember.aggregate([
    { $match: { mageGuildId: { $in: guilds.map((guild) => guild._id) } } },
    { $group: { _id: '$mageGuildId', total: { $sum: 1 } } },
  ]);
  const countByGuild = new Map(counts.map((row) => [String(row._id), row.total]));
  const lines = guilds.length
    ? guilds.map((guild) => `${guild.name} - ${countByGuild.get(String(guild._id)) || 0} membre(s) - ${truncateText(guild.description, 70)}`)
    : ['Aucune guilde n’a encore été créée sur ce serveur.'];
  const components = [];
  if (guilds.length) {
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('guild:browse:select')
        .setPlaceholder('Choisir une guilde')
        .addOptions(guilds.map((guild) => new StringSelectMenuOptionBuilder()
          .setLabel(truncateText(guild.name, 100))
          .setEmoji('🏰')
          .setDescription(`${countByGuild.get(String(guild._id)) || 0} membre(s)`)
          .setValue(String(guild._id)))),
    ));
  }
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('guild:ranking').setLabel('Classement').setEmoji('🏆').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('guild:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  ));

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guildes.png', variant: 'guild', section: 'Guildes de mages',
    title: `${guilds.length} guilde(s)`, subtitle: 'Consulte une guilde avant de lui envoyer ta candidature.',
    lines, footer: 'Guilde - Annuaire',
  });
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components }));
}

async function showGuildDetail(interaction, mageGuildId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  if ((await getGuildContext(profile)).membership) return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');
  const mageGuild = await MageGuild.findOne({ _id: mageGuildId, guildId: interaction.guildId });
  if (!mageGuild) return replyError(interaction, 'Cette guilde n’existe plus.');
  const [owner, memberCount, existing] = await Promise.all([
    Profile.findById(mageGuild.ownerProfileId),
    GuildMember.countDocuments({ mageGuildId: mageGuild._id }),
    GuildApplication.exists({ mageGuildId: mageGuild._id, profileId: profile._id }),
  ]);
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guilde-detail.png', variant: 'guild', section: 'Fiche de guilde',
    title: mageGuild.name, subtitle: `${memberCount} membre(s) - Maître : ${owner?.characterName || 'Inconnu'}`,
    lines: [mageGuild.description, existing ? 'Ta candidature est déjà en attente.' : 'Tu peux envoyer une candidature au conseil de cette guilde.'],
    footer: 'Guilde - Candidature',
  });
  const buttons = [];
  if (!existing) buttons.push(new ButtonBuilder().setCustomId(`guild:apply:${mageGuild._id}`).setLabel('Postuler').setEmoji('📨').setStyle(ButtonStyle.Success));
  buttons.push(new ButtonBuilder().setCustomId('guild:browse').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary));
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components: [new ActionRowBuilder().addComponents(buttons)] }));
}

function showApplicationModal(interaction, mageGuildId) {
  const modal = new ModalBuilder().setCustomId(`guild:apply:${mageGuildId}:modal`).setTitle('Postuler à cette guilde');
  modal.addComponents(modalText('message', 'Message de candidature', {
    style: TextInputStyle.Paragraph, maxLength: 500, required: false, placeholder: 'Présente ton personnage et ses motivations.',
  }));
  return interaction.showModal(modal);
}

async function handleApplicationModal(interaction, mageGuildId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  if ((await getGuildContext(profile)).membership) return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');
  const mageGuild = await MageGuild.findOne({ _id: mageGuildId, guildId: interaction.guildId });
  if (!mageGuild) return replyError(interaction, 'Cette guilde n’existe plus.');
  try {
    await GuildApplication.create({
      guildId: interaction.guildId, mageGuildId: mageGuild._id, profileId: profile._id,
      message: interaction.fields.getTextInputValue('message').trim(),
    });
  } catch (error) {
    if (error?.code === 11000) return replyError(interaction, 'Ta candidature est déjà en attente.');
    throw error;
  }
  await sendGuildLog(interaction.guild, 'Candidature de guilde', [`**${profile.characterName}** postule auprès de **${mageGuild.name}**.`], 0xffb347);
  return interaction.reply({ content: `✅ Ta candidature a été envoyée à **${mageGuild.name}**.`, flags: MessageFlags.Ephemeral });
}

async function showApplications(interaction) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const applications = await GuildApplication.find({ mageGuildId: state.context.mageGuild._id })
    .populate('profileId').sort({ createdAt: 1 }).limit(25);
  const components = [];
  if (applications.length) {
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('guild:applications:select').setPlaceholder('Examiner une candidature')
        .addOptions(applications.map((application) => new StringSelectMenuOptionBuilder()
          .setLabel(truncateText(application.profileId?.characterName || 'Profil supprimé', 100))
          .setEmoji('👤')
          .setDescription(truncateText(application.message || 'Aucun message', 100))
          .setValue(String(application._id)))),
    ));
  }
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('guild:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  ));
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-candidatures.png', variant: 'guild', section: `${state.context.mageGuild.name} - Recrutement`,
    title: `${applications.length} candidature(s)`, subtitle: 'Sélectionne un personnage pour accepter ou refuser sa demande.',
    lines: applications.length
      ? applications.map((application) => `${application.profileId?.characterName || 'Profil supprimé'} - ${truncateText(application.message || 'Aucun message', 90)}`)
      : ['Aucune candidature en attente.'],
    footer: 'Guilde - Candidatures',
  });
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components }));
}

async function showApplicationDetail(interaction, applicationId) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const application = await GuildApplication.findOne({ _id: applicationId, mageGuildId: state.context.mageGuild._id }).populate('profileId');
  if (!application?.profileId) return replyError(interaction, 'Cette candidature n’existe plus.');
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-candidature.png', variant: 'guild', section: 'Candidature',
    title: application.profileId.characterName,
    subtitle: `Rang ${application.profileId.mageRank} - Niveau ${application.profileId.level} - Puissance ${application.profileId.powerLevel}`,
    lines: [application.message || 'Aucun message de candidature.'], footer: `Candidature pour ${state.context.mageGuild.name}`,
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`guild:application:accept:${application._id}`).setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`guild:application:decline:${application._id}`).setLabel('Refuser').setEmoji('✖️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('guild:applications').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  );
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components: [row] }));
}

async function resolveApplication(interaction, applicationId, accept) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const application = await GuildApplication.findOne({ _id: applicationId, mageGuildId: state.context.mageGuild._id }).populate('profileId');
  if (!application?.profileId) return replyError(interaction, 'Cette candidature n’existe plus.');
  const target = application.profileId;
  if (!accept) {
    await application.deleteOne();
    await sendGuildLog(interaction.guild, 'Candidature refusée', [`**${target.characterName}** n’est pas admis(e) dans **${state.context.mageGuild.name}**.`, `Décision : **${state.profile.characterName}**`], 0xff6b6b);
    await interaction.deferUpdate();
    return showApplications(interaction);
  }
  if (await GuildMember.exists({ guildId: interaction.guildId, profileId: target._id })) {
    await GuildApplication.deleteMany({ guildId: interaction.guildId, profileId: target._id });
    return replyError(interaction, 'Ce personnage a déjà rejoint une guilde.');
  }
  try {
    await GuildMember.create({ guildId: interaction.guildId, mageGuildId: state.context.mageGuild._id, profileId: target._id });
  } catch (error) {
    if (error?.code === 11000) return replyError(interaction, 'Ce personnage a déjà rejoint une guilde.');
    throw error;
  }
  await Promise.all([
    GuildApplication.deleteMany({ guildId: interaction.guildId, profileId: target._id }),
    GuildInvite.deleteMany({ guildId: interaction.guildId, profileId: target._id }),
    Profile.updateOne({ _id: target._id }, { $set: { guildName: state.context.mageGuild.name } }),
  ]);
  await sendGuildLog(interaction.guild, 'Candidature acceptée', [`**${target.characterName}** rejoint **${state.context.mageGuild.name}**.`, `Décision : **${state.profile.characterName}**`], 0x64d2a6);
  await interaction.deferUpdate();
  return showApplications(interaction);
}

async function showGuildRanking(interaction) {
  const guilds = await MageGuild.find({ guildId: interaction.guildId }).limit(100);
  const memberships = await GuildMember.find({ mageGuildId: { $in: guilds.map((guild) => guild._id) } }).populate('profileId').limit(500);
  const rowsByGuild = new Map(guilds.map((guild) => [String(guild._id), { guild, members: [], power: 0, levels: 0 }]));
  await Promise.all(memberships.map(async (membership) => {
    const row = rowsByGuild.get(String(membership.mageGuildId));
    if (!row || !membership.profileId) return;
    const power = await getProfilePowerWithEquipment(membership.profileId);
    row.members.push(membership.profileId);
    row.power += Number(power.totalPower || 0);
    row.levels += Number(membership.profileId.level || 1);
  }));
  const ranking = [...rowsByGuild.values()]
    .sort((a, b) => b.power - a.power || b.members.length - a.members.length || b.levels - a.levels)
    .slice(0, 10);
  const medals = ['🥇', '🥈', '🥉'];
  const lines = ranking.length ? ranking.map((row, index) => (
    `${medals[index] || `#${index + 1}`} ${row.guild.name} - ${row.power.toLocaleString('fr-FR')} puissance - ${row.members.length} membre(s) - ${row.levels} niveaux`
  )) : ['Aucune guilde classée pour l’instant.'];
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  const context = profile ? await getGuildContext(profile) : { membership: null };
  const backId = context.membership ? 'guild:home' : 'guild:browse';
  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-classement-guildes.png', variant: 'ranking', section: 'Classement des guildes',
    title: 'Puissance collective', subtitle: 'Puissance totale équipée, puis effectif et niveaux cumulés.',
    lines, footer: 'Guilde - Classement',
  });
  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(backId).setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
    )],
  }));
}

async function showInvitation(interaction, inviteId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  const invite = await GuildInvite.findOne({ _id: inviteId, guildId: interaction.guildId, profileId: profile._id }).populate('mageGuildId');
  if (!invite?.mageGuildId) return replyError(interaction, 'Cette invitation n’existe plus.');

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-guilde-invitation.png', variant: 'guild', section: 'Invitation de guilde',
    title: invite.mageGuildId.name, subtitle: `Pour ${profile.characterName}`,
    lines: [invite.mageGuildId.description, 'Accepter rejoindra cette guilde avec ton personnage actif.'],
    footer: 'Guilde - Invitation',
  });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`guild:invite:accept:${invite._id}`).setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`guild:invite:decline:${invite._id}`).setLabel('Refuser').setEmoji('✖️').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('guild:home').setLabel('Retour').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  );
  return respondCanvas(interaction, createLargeCanvasPayload({ attachment, components: [row] }));
}

async function resolveInvitation(interaction, inviteId, accept) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return replyError(interaction, 'Aucun personnage actif.');
  const invite = await GuildInvite.findOne({ _id: inviteId, guildId: interaction.guildId, profileId: profile._id });
  if (!invite) return replyError(interaction, 'Cette invitation n’existe plus.');

  if (!accept) {
    await invite.deleteOne();
    await interaction.deferUpdate();
    return openGuildHub(interaction);
  }
  if (await GuildMember.exists({ guildId: interaction.guildId, profileId: profile._id })) {
    return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');
  }
  const mageGuild = await MageGuild.findById(invite.mageGuildId);
  if (!mageGuild) {
    await invite.deleteOne();
    return replyError(interaction, 'Cette guilde n’existe plus.');
  }

  try {
    await GuildMember.create({ guildId: interaction.guildId, mageGuildId: mageGuild._id, profileId: profile._id });
  } catch (error) {
    if (error?.code === 11000) return replyError(interaction, 'Ton personnage appartient déjà à une guilde.');
    throw error;
  }
  await Promise.all([
    GuildInvite.deleteMany({ guildId: interaction.guildId, profileId: profile._id }),
    GuildApplication.deleteMany({ guildId: interaction.guildId, profileId: profile._id }),
    Profile.updateOne({ _id: profile._id }, { $set: { guildName: mageGuild.name } }),
  ]);
  await sendGuildLog(interaction.guild, 'Membre de guilde', [`**${profile.characterName}** rejoint **${mageGuild.name}**.`], 0x64d2a6);
  await interaction.deferUpdate();
  return openGuildHub(interaction);
}

function showMemberActionModal(interaction, action) {
  const isKick = action === 'kick';
  const modal = new ModalBuilder()
    .setCustomId(`guild:${action}:modal`)
    .setTitle(isKick ? 'Exclure un membre' : 'Attribuer un rang');
  modal.addComponents(modalText('characterName', 'Nom exact du personnage'));
  if (!isKick) modal.addComponents(modalText('rankName', 'Nom exact du rang', { required: false, placeholder: 'Vide pour retirer le rang' }));
  return interaction.showModal(modal);
}

async function handleKickModal(interaction) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const target = await findProfileByName(interaction.guildId, interaction.fields.getTextInputValue('characterName'));
  if (!target) return replyError(interaction, 'Personnage introuvable.');
  if (String(target._id) === String(state.context.mageGuild.ownerProfileId)) return replyError(interaction, 'Le maître de guilde ne peut pas être exclu.');
  const membership = await GuildMember.findOne({ mageGuildId: state.context.mageGuild._id, profileId: target._id });
  if (!membership) return replyError(interaction, 'Ce personnage n’est pas membre de ta guilde.');
  const targetRank = membership.rankId ? await GuildRank.findById(membership.rankId) : null;
  if (!outranks(state.context, targetRank)) return replyError(interaction, 'Tu ne peux pas exclure un membre de rang égal ou supérieur au tien.');
  await membership.deleteOne();
  await Profile.updateOne({ _id: target._id }, { $set: { guildName: 'Sans guilde' } });
  await sendGuildLog(interaction.guild, 'Exclusion de guilde', [`**${target.characterName}** a été exclu(e) de **${state.context.mageGuild.name}**.`, `Par : **${state.profile.characterName}**`], 0xff6b6b);
  return interaction.reply({ content: `✅ **${target.characterName}** a été exclu(e).`, flags: MessageFlags.Ephemeral });
}

async function handleAssignModal(interaction) {
  const state = await requireGuildPermission(interaction, 'members');
  if (state.error) return replyError(interaction, state.error);
  const target = await findProfileByName(interaction.guildId, interaction.fields.getTextInputValue('characterName'));
  if (!target) return replyError(interaction, 'Personnage introuvable.');
  if (String(target._id) === String(state.context.mageGuild.ownerProfileId)) return replyError(interaction, 'Le maître de guilde possède déjà le rang le plus élevé.');
  const membership = await GuildMember.findOne({ mageGuildId: state.context.mageGuild._id, profileId: target._id });
  if (!membership) return replyError(interaction, 'Ce personnage n’est pas membre de ta guilde.');
  const rankName = interaction.fields.getTextInputValue('rankName').trim();
  const rank = rankName ? await GuildRank.findOne({ mageGuildId: state.context.mageGuild._id, nameKey: normalizeName(rankName) }) : null;
  if (rankName && !rank) return replyError(interaction, 'Ce rang n’existe pas.');
  const currentRank = membership.rankId ? await GuildRank.findById(membership.rankId) : null;
  if (!outranks(state.context, currentRank)) return replyError(interaction, 'Tu ne peux pas modifier un membre de rang égal ou supérieur au tien.');
  if (!state.context.isOwner && rank && Number(rank.priority) >= Number(state.context.rank?.priority || 0)) {
    return replyError(interaction, 'Tu ne peux pas attribuer un rang égal ou supérieur au tien.');
  }
  if (rank && (rank.canManageMembers || rank.canManageRanks) && !canManageRanks(state.context)) {
    return replyError(interaction, 'Seul le maître ou un rang autorisé à gérer les rangs peut attribuer ce rang privilégié.');
  }
  membership.rankId = rank?._id || null;
  await membership.save();
  await sendGuildLog(interaction.guild, 'Rang de guilde modifié', [`Membre : **${target.characterName}**`, `Rang : **${rank?.name || 'Membre'}**`, `Par : **${state.profile.characterName}**`], 0x64d2a6);
  return interaction.reply({ content: `✅ Rang de **${target.characterName}** : **${rank?.name || 'Membre'}**.`, flags: MessageFlags.Ephemeral });
}

function showRankModal(interaction, action) {
  const create = action === 'create';
  const modal = new ModalBuilder().setCustomId(`guild:rank:${action}:modal`).setTitle(create ? 'Créer un rang' : 'Supprimer un rang');
  modal.addComponents(modalText('rankName', 'Nom exact du rang', { maxLength: 50 }));
  if (create) modal.addComponents(
    modalText('priority', 'Priorité (0 à 100)', { required: false, maxLength: 3, placeholder: '0' }),
    modalText('manageMembers', 'Peut gérer les membres ? oui / non', { required: false, maxLength: 3, placeholder: 'non' }),
    modalText('manageRanks', 'Peut gérer les rangs ? oui / non', { required: false, maxLength: 3, placeholder: 'non' }),
  );
  return interaction.showModal(modal);
}

async function handleRankCreateModal(interaction) {
  const state = await requireGuildPermission(interaction, 'ranks');
  if (state.error) return replyError(interaction, state.error);
  const name = interaction.fields.getTextInputValue('rankName').trim();
  if (name.length < 2) return replyError(interaction, 'Le nom du rang doit contenir au moins 2 caractères.');
  try {
    await GuildRank.create({
      guildId: interaction.guildId, mageGuildId: state.context.mageGuild._id, name, nameKey: normalizeName(name),
      priority: parsePriority(interaction.fields.getTextInputValue('priority')),
      canManageMembers: parseBoolean(interaction.fields.getTextInputValue('manageMembers')),
      canManageRanks: parseBoolean(interaction.fields.getTextInputValue('manageRanks')),
    });
  } catch (error) {
    if (error?.code === 11000) return replyError(interaction, 'Un rang porte déjà ce nom.');
    throw error;
  }
  return interaction.reply({ content: `✅ Le rang **${name}** a été créé.`, flags: MessageFlags.Ephemeral });
}

async function handleRankDeleteModal(interaction) {
  const state = await requireGuildPermission(interaction, 'ranks');
  if (state.error) return replyError(interaction, state.error);
  const rank = await GuildRank.findOne({ mageGuildId: state.context.mageGuild._id, nameKey: normalizeName(interaction.fields.getTextInputValue('rankName')) });
  if (!rank) return replyError(interaction, 'Ce rang n’existe pas.');
  await Promise.all([
    GuildMember.updateMany({ mageGuildId: state.context.mageGuild._id, rankId: rank._id }, { $set: { rankId: null } }),
    rank.deleteOne(),
  ]);
  return interaction.reply({ content: `✅ Le rang **${rank.name}** a été supprimé.`, flags: MessageFlags.Ephemeral });
}

function showConfirmModal(interaction, action, guildName) {
  const modal = new ModalBuilder().setCustomId(`guild:${action}:modal`).setTitle(action === 'leave' ? 'Quitter la guilde' : 'Dissoudre la guilde');
  modal.addComponents(modalText('confirmation', `Écris ${guildName} pour confirmer`, { maxLength: 80 }));
  return interaction.showModal(modal);
}

async function handleLeaveModal(interaction) {
  const state = await requireGuildPermission(interaction);
  if (state.error) return replyError(interaction, state.error);
  if (state.context.isOwner) return replyError(interaction, 'Le maître doit dissoudre la guilde.');
  if (interaction.fields.getTextInputValue('confirmation').trim() !== state.context.mageGuild.name) return replyError(interaction, 'Confirmation incorrecte.');
  await Promise.all([
    state.context.membership.deleteOne(),
    Profile.updateOne({ _id: state.profile._id }, { $set: { guildName: 'Sans guilde' } }),
  ]);
  await sendGuildLog(interaction.guild, 'Départ de guilde', [`**${state.profile.characterName}** quitte **${state.context.mageGuild.name}**.`], 0xffb347);
  return interaction.reply({ content: `Tu as quitté **${state.context.mageGuild.name}**.`, flags: MessageFlags.Ephemeral });
}

async function handleDisbandModal(interaction) {
  const state = await requireGuildPermission(interaction, 'owner');
  if (state.error) return replyError(interaction, state.error);
  if (interaction.fields.getTextInputValue('confirmation').trim() !== state.context.mageGuild.name) return replyError(interaction, 'Confirmation incorrecte.');
  const memberships = await GuildMember.find({ mageGuildId: state.context.mageGuild._id }).select('profileId');
  const profileIds = memberships.map((member) => member.profileId);
  await Promise.all([
    GuildApplication.deleteMany({ mageGuildId: state.context.mageGuild._id }),
    GuildInvite.deleteMany({ mageGuildId: state.context.mageGuild._id }),
    GuildRank.deleteMany({ mageGuildId: state.context.mageGuild._id }),
    GuildMember.deleteMany({ mageGuildId: state.context.mageGuild._id }),
    Profile.updateMany({ _id: { $in: profileIds } }, { $set: { guildName: 'Sans guilde' } }),
    state.context.mageGuild.deleteOne(),
  ]);
  await sendGuildLog(interaction.guild, 'Guilde dissoute', [`**${state.context.mageGuild.name}** a été dissoute par **${state.profile.characterName}**.`], 0xff6b6b);
  return interaction.reply({ content: `La guilde **${state.context.mageGuild.name}** a été dissoute.`, flags: MessageFlags.Ephemeral });
}

async function handleGuildComponent(interaction) {
  const id = interaction.customId;
  if (id === 'guild:home') return openGuildHub(interaction);
  if (id === 'guild:create') return showCreateModal(interaction);
  if (id === 'guild:members') return showMembers(interaction);
  if (id === 'guild:ranks') return showRanks(interaction);
  if (id === 'guild:ranking') return showGuildRanking(interaction);
  if (id === 'guild:browse') return showGuildBrowser(interaction);
  if (id === 'guild:browse:select') return showGuildDetail(interaction, interaction.values[0]);
  if (id === 'guild:applications') return showApplications(interaction);
  if (id === 'guild:applications:select') return showApplicationDetail(interaction, interaction.values[0]);
  if (id === 'guild:invite') return showInviteModal(interaction);
  if (id === 'guild:kick') return showMemberActionModal(interaction, 'kick');
  if (id === 'guild:assign') return showMemberActionModal(interaction, 'assign');
  if (id === 'guild:rank:create') return showRankModal(interaction, 'create');
  if (id === 'guild:rank:delete') return showRankModal(interaction, 'delete');
  if (id === 'guild:invite:select') return showInvitation(interaction, interaction.values[0]);
  if (id.startsWith('guild:invite:accept:')) return resolveInvitation(interaction, id.split(':').pop(), true);
  if (id.startsWith('guild:invite:decline:')) return resolveInvitation(interaction, id.split(':').pop(), false);
  if (id.startsWith('guild:application:accept:')) return resolveApplication(interaction, id.split(':').pop(), true);
  if (id.startsWith('guild:application:decline:')) return resolveApplication(interaction, id.split(':').pop(), false);
  if (id.startsWith('guild:apply:')) return showApplicationModal(interaction, id.split(':')[2]);
  if (id === 'guild:leave' || id === 'guild:disband') {
    const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
    if (!profile) return replyError(interaction, 'Aucun personnage actif.');
    const context = await getGuildContext(profile);
    if (!context.mageGuild) return replyError(interaction, 'Ton personnage n’appartient à aucune guilde.');
    return showConfirmModal(interaction, id.split(':')[1], context.mageGuild.name);
  }
  return replyError(interaction, 'Interaction de guilde inconnue.');
}

async function handleGuildModal(interaction) {
  const id = interaction.customId;
  if (id === 'guild:create:modal') return handleCreateModal(interaction);
  if (id === 'guild:invite:modal') return handleInviteModal(interaction);
  if (id === 'guild:kick:modal') return handleKickModal(interaction);
  if (id === 'guild:assign:modal') return handleAssignModal(interaction);
  if (id === 'guild:rank:create:modal') return handleRankCreateModal(interaction);
  if (id === 'guild:rank:delete:modal') return handleRankDeleteModal(interaction);
  if (id === 'guild:leave:modal') return handleLeaveModal(interaction);
  if (id === 'guild:disband:modal') return handleDisbandModal(interaction);
  if (id.startsWith('guild:apply:') && id.endsWith(':modal')) return handleApplicationModal(interaction, id.split(':')[2]);
  return replyError(interaction, 'Formulaire de guilde inconnu.');
}

module.exports = { openGuildHub, handleGuildComponent, handleGuildModal };
