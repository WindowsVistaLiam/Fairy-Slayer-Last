const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { formatNumber } = require('../utils/format');

async function createLevelUpCanvas(profile, gainedXp) {
  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 900, 300);
  gradient.addColorStop(0, '#090d18');
  gradient.addColorStop(1, '#42235d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 900, 300);

  ctx.strokeStyle = '#ffdf91';
  ctx.lineWidth = 5;
  ctx.strokeRect(18, 18, 864, 264);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('NIVEAU SUPÉRIEUR', 48, 88);

  ctx.fillStyle = '#d9d2ff';
  ctx.font = '30px sans-serif';
  ctx.fillText(profile.characterName, 48, 145);

  ctx.fillStyle = '#ffdf91';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText(`Niveau RP ${profile.level}`, 48, 210);

  ctx.fillStyle = '#ffffff';
  ctx.font = '24px sans-serif';
  ctx.fillText(`XP gagné : ${formatNumber(gainedXp)}`, 48, 252);

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-level-up.png',
  });
}

module.exports = { createLevelUpCanvas };
