const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getXpNeeded } = require('../utils/xp');
const { getRankLabel } = require('../utils/ranks');
const { getReputationLabel } = require('../utils/reputation');
const { formatNumber, truncateText } = require('../utils/format');

try {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVu Sans');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVu Sans Bold');
} catch (_) {
  // Les polices système Discord/Railway suffisent si DejaVu n'existe pas.
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size = 28, color = '#ffffff', bold = false) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px "DejaVu Sans"`;
  ctx.fillText(text, x, y);
}

async function loadRemoteImage(url) {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return await loadImage(buffer);
  } catch (_) {
    return null;
  }
}

function drawStatBox(ctx, label, value, x, y, w = 220, h = 78) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#162033';
  ctx.fill();
  ctx.strokeStyle = '#6d5dfc';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  drawText(ctx, label, x + 18, y + 28, 18, '#b8c7ff');
  drawText(ctx, value, x + 18, y + 59, 27, '#ffffff', true);
}

async function createProfileCanvas(profile, discordUser) {
  const width = 1200;
  const height = 720;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#080b14');
  gradient.addColorStop(0.45, '#111936');
  gradient.addColorStop(1, '#2b123a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Effets magiques de fond.
  for (let i = 0; i < 32; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 2 + Math.random() * 5;
    ctx.globalAlpha = 0.15 + Math.random() * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#d7c6ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Carte centrale.
  roundRect(ctx, 44, 44, width - 88, height - 88, 34);
  ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
  ctx.fill();
  ctx.strokeStyle = '#a48cff';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Bandeau titre.
  roundRect(ctx, 70, 70, 1060, 92, 24);
  ctx.fillStyle = 'rgba(89, 67, 191, 0.36)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 95, 113, 26, '#d9d2ff', true);
  drawText(ctx, truncateText(profile.characterName, 28), 95, 150, 42, '#ffffff', true);

  drawText(ctx, getRankLabel(profile.mageRank), 785, 112, 28, '#ffdf91', true);
  drawText(ctx, `Puissance ${formatNumber(profile.powerLevel)}`, 785, 150, 26, '#ffffff', true);

  // Avatar.
  const avatarUrl = profile.avatarUrl || discordUser.displayAvatarURL({ extension: 'png', size: 512 });
  const avatar = await loadRemoteImage(avatarUrl);

  ctx.save();
  roundRect(ctx, 82, 192, 315, 405, 30);
  ctx.fillStyle = '#12182a';
  ctx.fill();
  ctx.strokeStyle = '#6d5dfc';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.clip();

  if (avatar) {
    const scale = Math.max(315 / avatar.width, 405 / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    ctx.drawImage(avatar, 82 + (315 - drawW) / 2, 192 + (405 - drawH) / 2, drawW, drawH);
  } else {
    drawText(ctx, 'Aucune image', 142, 390, 28, '#ffffff', true);
  }
  ctx.restore();

  // Infos principales.
  drawText(ctx, 'Magie', 435, 215, 22, '#b8c7ff');
  drawText(ctx, truncateText(profile.magicType, 35), 435, 252, 34, '#ffffff', true);

  drawText(ctx, 'Guilde', 435, 300, 22, '#b8c7ff');
  drawText(ctx, truncateText(profile.guildName, 35), 435, 337, 32, '#ffffff', true);

  drawText(ctx, 'Titre', 435, 385, 22, '#b8c7ff');
  drawText(ctx, truncateText(profile.title, 40), 435, 422, 30, '#ffffff', true);

  const xpNeeded = getXpNeeded(profile.level);
  const progress = Math.min(1, profile.xp / xpNeeded);

  drawText(ctx, `Niveau RP ${profile.level}`, 435, 485, 30, '#ffffff', true);
  drawText(ctx, `${formatNumber(profile.xp)} / ${formatNumber(xpNeeded)} XP`, 745, 485, 24, '#d9d2ff');

  roundRect(ctx, 435, 506, 610, 24, 12);
  ctx.fillStyle = '#111827';
  ctx.fill();
  roundRect(ctx, 435, 506, 610 * progress, 24, 12);
  ctx.fillStyle = '#9b8cff';
  ctx.fill();

  drawStatBox(ctx, 'Jewels', formatNumber(profile.jewels), 435, 565);
  drawStatBox(ctx, 'Réputation', `${profile.reputation} · ${getReputationLabel(profile.reputation)}`, 675, 565, 370);

  // Description.
  roundRect(ctx, 82, 615, 963, 54, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  drawText(ctx, truncateText(profile.description, 86), 105, 650, 22, '#e8e7ff');

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-profil.png',
  });
}

module.exports = { createProfileCanvas };
