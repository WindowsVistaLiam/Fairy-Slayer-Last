const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');

const Profile = require('../../models/Profile');
const Relation = require('../../models/Relation');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { getActiveProfile } = require('../../utils/activeProfile');
const { formatNumber, truncateText } = require('../../utils/format');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');

function clampNumber(value, min, max, fallback) {
  const parsed = Number.parseInt(String(value || '').trim(), 10);

  if (Number.isNaN(parsed)) return fallback;

  return Math.max(min, Math.min(max, parsed));
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getProfileNameRegex(characterName) {
  return {
    $regex: `^${escapeRegex(characterName)}$`,
    $options: 'i',
  };
}

async function findProfileByName(guildId, characterName) {
  return Profile.findOne({
    guildId,
    characterName: getProfileNameRegex(characterName),
  });
}

function getRelationTypeLabel(type) {
  const labels = {
    ami: 'Ami',
    allie: 'Allié',
    allié: 'Allié',
    rival: 'Rival',
    ennemi: 'Ennemi',
    famille: 'Famille',
    mentor: 'Mentor',
    eleve: 'Élève',
    élève: 'Élève',
    amour: 'Amour',
    neutre: 'Neutre',
  };

  return labels[String(type || '').toLowerCase()] || truncateText(type || 'Neutre', 30);
}

function normalizeRelationType(type) {
  const normalized = String(type || 'neutre')
    .trim()
    .toLowerCase();

  if (!normalized) return 'neutre';

  const aliases = {
    allié: 'allie',
    élève: 'eleve',
  };

  return aliases[normalized] || normalized.slice(0, 40);
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

async function getRelationRows(profile) {
  const relations = await Relation.find({
    ownerProfileId: profile._id,
  })
    .sort({ updatedAt: -1 })
    .limit(25);

  const targetIds = relations.map((relation) => relation.targetProfileId);
  const targets = await Profile.find({ _id: { $in: targetIds } });
  const targetById = new Map(targets.map((target) => [String(target._id), target]));

  const rows = [];

  if (relations.length) {
    const options = relations.map((relation) => {
      const target = targetById.get(String(relation.targetProfileId));

      return new StringSelectMenuOptionBuilder()
        .setLabel(truncateText(target?.characterName || 'Personnage inconnu', 100))
        .setDescription(
          `${getRelationTypeLabel(relation.type)} · confiance ${relation.trust} · tension ${relation.tension}`.slice(0, 100),
        )
        .setValue(String(relation._id));
    });

    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('relation:select')
          .setPlaceholder('Voir le détail d’une relation')
          .addOptions(options),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('relation:add')
        .setLabel('Ajouter / modifier')
        .setEmoji('➕')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('relation:delete')
        .setLabel('Supprimer')
        .setEmoji('🗑️')
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId('profile:home')
        .setLabel('Retour profil')
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

async function getRelationLines(profile) {
  const relations = await Relation.find({
    ownerProfileId: profile._id,
  })
    .sort({ updatedAt: -1 })
    .limit(10);

  if (!relations.length) {
    return {
      relations,
      lines: ['Aucune relation enregistrée pour ce personnage.'],
    };
  }

  const targetIds = relations.map((relation) => relation.targetProfileId);
  const targets = await Profile.find({ _id: { $in: targetIds } });
  const targetById = new Map(targets.map((target) => [String(target._id), target]));

  const lines = relations.map((relation) => {
    const target = targetById.get(String(relation.targetProfileId));
    const note = relation.note ? ` · ${truncateText(relation.note, 55)}` : '';

    return `${target?.characterName || 'Personnage inconnu'} — ${getRelationTypeLabel(relation.type)} · confiance ${relation.trust} · tension ${relation.tension}${note}`;
  });

  return {
    relations,
    lines,
  };
}

async function showRelations(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const { relations, lines } = await getRelationLines(profile);
  const rows = await getRelationRows(profile);

  const fileName = 'fairy-slayer-relations.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'relations',
    section: `Relations — ${profile.characterName}`,
    title: `${relations.length} relation(s) affichée(s)`,
    subtitle: 'Crée, modifie ou consulte les liens RP de ton personnage actif.',
    stats: [
      { label: 'Relations', value: formatNumber(relations.length) },
      { label: 'Alliés', value: formatNumber(relations.filter((r) => ['allie', 'allié', 'ami'].includes(r.type)).length) },
      { label: 'Rivaux', value: formatNumber(relations.filter((r) => r.type === 'rival').length) },
      { label: 'Ennemis', value: formatNumber(relations.filter((r) => r.type === 'ennemi').length) },
    ],
    lines,
    footer: 'Menu /profil - Relations',
  });

  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: rows,
  }));
}

async function showRelationDetail(interaction, relationId) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!profile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const relation = await Relation.findOne({
    _id: relationId,
    ownerProfileId: profile._id,
  });

  if (!relation) {
    return interaction.reply({
      content: 'Relation introuvable.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const target = await Profile.findById(relation.targetProfileId);

  const fileName = 'fairy-slayer-relation-detail.png';

  const attachment = await createPanelCanvas({
    fileName,
    variant: 'relations',
    section: `Relation — ${profile.characterName}`,
    title: target?.characterName || 'Personnage inconnu',
    subtitle: `${getRelationTypeLabel(relation.type)} · confiance ${relation.trust} · tension ${relation.tension}`,
    stats: [
      { label: 'Type', value: getRelationTypeLabel(relation.type) },
      { label: 'Confiance', value: formatNumber(relation.trust) },
      { label: 'Tension', value: formatNumber(relation.tension) },
      { label: 'Note', value: relation.note ? 'Oui' : 'Non' },
    ],
    lines: [
      `Personnage source : ${profile.characterName}`,
      `Personnage ciblé : ${target?.characterName || 'Personnage introuvable'}`,
      `Type : ${getRelationTypeLabel(relation.type)}`,
      `Confiance : ${relation.trust}/100`,
      `Tension : ${relation.tension}/100`,
      `Note : ${relation.note || 'Aucune note.'}`,
    ],
    footer: 'Menu /profil - Détail relation',
  });

  return respondCanvas(interaction, createLargeCanvasPayload({
    attachment,
    components: await getRelationRows(profile),
  }));
}

async function showRelationModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('relation:save:modal')
    .setTitle('Ajouter ou modifier une relation');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('targetName')
        .setLabel('Nom exact du personnage ciblé')
        .setPlaceholder('Exemple : Natsu Dragneel')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('type')
        .setLabel('Type de relation')
        .setPlaceholder('ami, allie, rival, ennemi, famille, mentor, amour...')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(40),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('trust')
        .setLabel('Confiance sur 100')
        .setPlaceholder('Exemple : 70')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(3),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('tension')
        .setLabel('Tension sur 100')
        .setPlaceholder('Exemple : 20')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(3),
    ),

    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('note')
        .setLabel('Note RP')
        .setPlaceholder('Résumé court de la relation')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(500),
    ),
  );

  return interaction.showModal(modal);
}

async function handleRelationSaveModal(interaction) {
  const ownerProfile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!ownerProfile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetName = interaction.fields.getTextInputValue('targetName').trim();
  const type = normalizeRelationType(interaction.fields.getTextInputValue('type'));
  const trust = clampNumber(interaction.fields.getTextInputValue('trust'), 0, 100, 50);
  const tension = clampNumber(interaction.fields.getTextInputValue('tension'), 0, 100, 0);
  const note = interaction.fields.getTextInputValue('note')?.trim() || '';

  const targetProfile = await findProfileByName(interaction.guildId, targetName);

  if (!targetProfile) {
    return interaction.reply({
      content: `Aucun personnage trouvé avec le nom exact **${truncateText(targetName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  if (String(targetProfile._id) === String(ownerProfile._id)) {
    return interaction.reply({
      content: 'Tu ne peux pas créer une relation avec le même personnage.',
      flags: MessageFlags.Ephemeral,
    });
  }

  await Relation.findOneAndUpdate(
    {
      ownerProfileId: ownerProfile._id,
      targetProfileId: targetProfile._id,
    },
    {
      ownerProfileId: ownerProfile._id,
      targetProfileId: targetProfile._id,
      type,
      trust,
      tension,
      note,
      createdBy: interaction.user.id,
      updatedBy: interaction.user.id,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  await interaction.reply({
    content: `✅ Relation enregistrée : **${ownerProfile.characterName}** → **${targetProfile.characterName}**.`,
    flags: MessageFlags.Ephemeral,
  });

  return null;
}

async function showDeleteRelationModal(interaction) {
  const modal = new ModalBuilder()
    .setCustomId('relation:delete:modal')
    .setTitle('Supprimer une relation');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('targetName')
        .setLabel('Nom exact du personnage ciblé')
        .setPlaceholder('Relation à supprimer')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(80),
    ),
  );

  return interaction.showModal(modal);
}

async function handleDeleteRelationModal(interaction) {
  const ownerProfile = await getActiveProfile(interaction.user.id, interaction.guildId);

  if (!ownerProfile) {
    return interaction.reply({
      content: 'Tu dois d’abord créer un personnage avec `/profil`.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const targetName = interaction.fields.getTextInputValue('targetName').trim();
  const targetProfile = await findProfileByName(interaction.guildId, targetName);

  if (!targetProfile) {
    return interaction.reply({
      content: `Aucun personnage trouvé avec le nom exact **${truncateText(targetName, 80)}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const deleted = await Relation.findOneAndDelete({
    ownerProfileId: ownerProfile._id,
    targetProfileId: targetProfile._id,
  });

  if (!deleted) {
    return interaction.reply({
      content: `Aucune relation trouvée entre **${ownerProfile.characterName}** et **${targetProfile.characterName}**.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    content: `✅ Relation supprimée : **${ownerProfile.characterName}** → **${targetProfile.characterName}**.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRelationComponent(interaction) {
  const id = interaction.customId;

  if (id === 'relation:menu') return showRelations(interaction);
  if (id === 'relation:add') return showRelationModal(interaction);
  if (id === 'relation:delete') return showDeleteRelationModal(interaction);

  if (id === 'relation:select') {
    return showRelationDetail(interaction, interaction.values[0]);
  }

  return interaction.reply({
    content: 'Interaction relation inconnue.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleRelationModal(interaction) {
  const id = interaction.customId;

  if (id === 'relation:save:modal') return handleRelationSaveModal(interaction);
  if (id === 'relation:delete:modal') return handleDeleteRelationModal(interaction);

  return interaction.reply({
    content: 'Formulaire relation inconnu.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  showRelations,
  handleRelationComponent,
  handleRelationModal,
};