const { EmbedBuilder } = require('discord.js');

function createLargeCanvasPayload({
  attachment,
  components = [],
  content = '',
  color = 0x7c5cff,
  keepSmallInfoEmbed = false,
}) {
  if (!attachment) {
    return {
      content,
      components,
      files: [],
    };
  }

  const payload = {
    content,
    components,
    files: [attachment],
  };

  if (keepSmallInfoEmbed) {
    payload.embeds = [
      new EmbedBuilder()
        .setColor(color)
        .setDescription('\u200B'),
    ];
  }

  return payload;
}

function createLargeCanvasReply({
  attachment,
  components = [],
  content = '',
  color = 0x7c5cff,
}) {
  return createLargeCanvasPayload({
    attachment,
    components,
    content,
    color,
    keepSmallInfoEmbed: false,
  });
}

module.exports = {
  createLargeCanvasPayload,
  createLargeCanvasReply,
};