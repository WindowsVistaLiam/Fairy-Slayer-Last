const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const { createPanelCanvas } = require('../../canvas/panelCanvas');
const { PROFESSIONS, getProfession } = require('../../data/professions');
const { getActiveProfile } = require('../../utils/activeProfile');
const { createLargeCanvasPayload } = require('../../utils/canvasMessage');

async function openProfessionHub(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) {
    return interaction.reply({ content: 'Tu dois d’abord créer un personnage avec `/profil`.', flags: MessageFlags.Ephemeral });
  }

  const profession = getProfession(profile.profession);
  const components = [];
  if (!profession) {
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('profession:choose')
        .setPlaceholder('Choisir un métier permanent')
        .addOptions(PROFESSIONS.map((entry) => new StringSelectMenuOptionBuilder()
          .setLabel(entry.name)
          .setEmoji(entry.emoji)
          .setDescription(entry.description.slice(0, 100))
          .setValue(entry.id))),
    ));
  }
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('profile:home').setLabel('Retour au profil').setEmoji('↩️').setStyle(ButtonStyle.Secondary),
  ));

  const attachment = await createPanelCanvas({
    fileName: 'fairy-slayer-metier.png',
    variant: 'profession',
    section: `Métier - ${profile.characterName}`,
    title: profession ? `${profession.emoji} ${profession.name}` : '✨ Choisis ta vocation',
    subtitle: profession ? profession.description : 'Ce choix est permanent pour ce personnage.',
    lines: profession
      ? [
        profession.craftCategory ? `Artisanat débloqué : ${profession.craftCategory}` : 'Ce métier accorde un bonus passif.',
        profession.id === 'barde' ? `Progression : ${profile.professionProgress?.bardLongMessages || 0}/10 messages longs` : 'Le bonus est appliqué automatiquement.',
      ]
      : PROFESSIONS.map((entry) => `${entry.emoji} ${entry.name} - ${entry.description}`),
    footer: profession?.craftCategory ? 'Utilise /craft pour ouvrir ton atelier.' : 'Le métier est lié au personnage actif.',
  });

  const payload = createLargeCanvasPayload({ attachment, components });
  if (interaction.isStringSelectMenu?.() || interaction.isButton?.()) return interaction.update(payload);
  return interaction.reply(payload);
}

async function chooseProfession(interaction) {
  const profile = await getActiveProfile(interaction.user.id, interaction.guildId);
  if (!profile) return interaction.reply({ content: 'Aucun personnage actif.', flags: MessageFlags.Ephemeral });
  if (profile.profession) {
    return interaction.reply({ content: 'Ton personnage possède déjà un métier permanent.', flags: MessageFlags.Ephemeral });
  }

  const profession = getProfession(interaction.values[0]);
  if (!profession) return interaction.reply({ content: 'Métier inconnu.', flags: MessageFlags.Ephemeral });

  profile.profession = profession.id;
  profile.professionChosenAt = new Date();
  if (profession.id === 'tresorier') profile.professionProgress.lastTreasurerPayoutAt = new Date();
  await profile.save();
  return openProfessionHub(interaction);
}

async function handleProfessionComponent(interaction) {
  if (interaction.customId === 'profession:home') return openProfessionHub(interaction);
  if (interaction.customId === 'profession:choose') return chooseProfession(interaction);
  return interaction.reply({ content: 'Action métier inconnue.', flags: MessageFlags.Ephemeral });
}

module.exports = { openProfessionHub, handleProfessionComponent };
