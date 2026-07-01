const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getXpNeeded } = require('../utils/xp');
const { getRankLabel } = require('../utils/ranks');
const { getReputationLabel } = require('../utils/reputation');
const { formatNumber, truncateText } = require('../utils/format');

function registerFonts() {
  const fonts = [
    ['C:/Windows/Fonts/segoeui.ttf', 'Segoe UI'],
    ['C:/Windows/Fonts/segoeuib.ttf', 'Segoe UI Bold'],
    ['C:/Windows/Fonts/arial.ttf', 'Arial'],
    ['C:/Windows/Fonts/arialbd.ttf', 'Arial Bold'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Segoe UI'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'Segoe UI Bold'],
    ['/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf', 'Segoe UI'],
    ['/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf', 'Segoe UI Bold'],
  ];

  for (const [path, name] of fonts) {
    try {
      GlobalFonts.registerFromPath(path, name);
    } catch (_) {
      // Police absente sur cet environnement : on ignore.
    }
  }
}

registerFonts();

const FONT = 'Segoe UI, Arial, sans-serif';

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

function setFont(ctx, size = 28, bold = false) {
  ctx.font = `${bold ? '700' : '400'} ${size}px ${FONT}`;
}

function drawText(ctx, text, x, y, size = 28, color = '#ffffff', bold = false, maxWidth = undefined) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);

  if (maxWidth) ctx.fillText(String(text || ''), x, y, maxWidth);
  else ctx.fillText(String(text || ''), x, y);

  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, width, size = 28, color = '#ffffff', bold = false) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  ctx.textAlign = 'center';
  ctx.fillText(String(text || ''), x + width / 2, y, width);
  ctx.restore();
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';
  let consumed = 0;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }

    consumed += 1;
    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) lines.push(currentLine);

  if (lines.length === maxLines && consumed < words.length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+$/u, '')}…`;
  }

  return lines;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, size = 24, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, false);

  const lines = wrapText(ctx, text, maxWidth, maxLines);
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight, maxWidth);
  }

  ctx.restore();
}

async function loadRemoteImage(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Fairy-Slayer-Discord-Bot/1.0' },
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return await loadImage(buffer);
  } catch (_) {
    return null;
  }
}

function drawGlowCircle(ctx, x, y, radius, color, alpha = 0.35) {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMagicCircle(ctx, x, y, radius, color = '#f7d078') {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
    const px = Math.cos(angle) * radius * 0.72;
    const py = Math.sin(angle) * radius * 0.72;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const x1 = Math.cos(angle) * radius * 0.84;
    const y1 = Math.sin(angle) * radius * 0.84;
    const x2 = Math.cos(angle) * radius;
    const y2 = Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawGuildCrest(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = '#f7d078';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f7d078';
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 4;

  // Emblème original inspiré d'une guilde magique, sans reprendre le logo officiel.
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.bezierCurveTo(42, -58, 62, -24, 38, 6);
  ctx.bezierCurveTo(78, 4, 98, 32, 66, 58);
  ctx.bezierCurveTo(34, 84, -4, 66, -8, 24);
  ctx.bezierCurveTo(-30, 56, -74, 62, -92, 28);
  ctx.bezierCurveTo(-108, -2, -74, -28, -34, -14);
  ctx.bezierCurveTo(-42, -48, -24, -76, 0, -70);
  ctx.closePath();
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1b1530';
  ctx.beginPath();
  ctx.arc(-6, 10, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawInfoBox(ctx, label, value, x, y, w, h, accent = '#f7d078') {
  ctx.save();

  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = 'rgba(18, 21, 39, 0.88)';
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(247, 208, 120, 0.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, x, y, 7, h, 8);
  ctx.fill();

  drawText(ctx, label, x + 22, y + 28, 18, '#c9bdf7', true);
  drawText(ctx, value, x + 22, y + 62, 27, '#ffffff', true, w - 38);

  ctx.restore();
}

function drawStatPill(ctx, label, value, x, y, w, color = '#f7d078') {
  ctx.save();

  roundRect(ctx, x, y, w, 54, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.stroke();

  drawText(ctx, label, x + 18, y + 22, 15, '#bdb4e8', true);
  drawText(ctx, value, x + 18, y + 43, 21, color, true, w - 30);

  ctx.restore();
}

function drawPowerGauge(ctx, x, y, w, h, value) {
  const maxPower = 10000;
  const progress = Math.max(0.03, Math.min(1, Number(value || 0) / maxPower));

  ctx.save();

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(10, 13, 26, 0.9)';
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, '#7c5cff');
  gradient.addColorStop(0.45, '#f7d078');
  gradient.addColorStop(1, '#ff7a45');

  roundRect(ctx, x, y, w * progress, h, h / 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();

  ctx.restore();
}

function drawAvatarFrame(ctx, x, y, w, h) {
  ctx.save();

  ctx.shadowColor = 'rgba(124, 92, 255, 0.75)';
  ctx.shadowBlur = 28;
  roundRect(ctx, x, y, w, h, 28);
  ctx.fillStyle = 'rgba(13, 17, 32, 0.92)';
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f7d078';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(124, 92, 255, 0.8)';
  ctx.lineWidth = 2;
  roundRect(ctx, x + 10, y + 10, w - 20, h - 20, 22);
  ctx.stroke();

  ctx.restore();
}

async function createProfileCanvas(profile, discordUser) {
  const width = 1400;
  const height = 820;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const characterName = profile.characterName || 'Personnage inconnu';
  const mageRank = profile.mageRank || 'C';
  const powerLevel = Number(profile.powerLevel || 0);
  const guildName = profile.guildName || 'Guilde inconnue';
  const magicType = profile.magicType || 'Magie inconnue';
  const title = profile.title || 'Aucun titre équipé';
  const age = profile.age || 'Inconnu';
  const reputation = Number(profile.reputation || 0);
  const jewels = Number(profile.jewels || 0);
  const level = Number(profile.level || 1);
  const xp = Number(profile.xp || 0);
  const xpNeeded = getXpNeeded(level);
  const xpProgress = Math.max(0.02, Math.min(1, xp / xpNeeded));

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#120819');
  background.addColorStop(0.28, '#25104b');
  background.addColorStop(0.58, '#10182e');
  background.addColorStop(1, '#3a111b');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawGlowCircle(ctx, 120, 120, 260, '#7c5cff', 0.45);
  drawGlowCircle(ctx, 1240, 160, 300, '#f7d078', 0.25);
  drawGlowCircle(ctx, 1220, 720, 310, '#ff6b3d', 0.22);
  drawGlowCircle(ctx, 260, 760, 280, '#38d5ff', 0.18);

  ctx.save();
  for (let i = 0; i < 90; i += 1) {
    const x = 40 + ((i * 431) % 1320);
    const y = 34 + ((i * 229) % 760);
    const radius = 1 + (i % 5) * 0.65;
    ctx.globalAlpha = 0.12 + (i % 7) * 0.055;
    ctx.fillStyle = i % 3 === 0 ? '#f7d078' : '#d7c6ff';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawMagicCircle(ctx, 1120, 220, 120, '#f7d078');
  drawMagicCircle(ctx, 170, 670, 100, '#8f7cff');

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 34;
  roundRect(ctx, 54, 54, width - 108, height - 108, 38);
  ctx.fillStyle = 'rgba(9, 12, 26, 0.86)';
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(247, 208, 120, 0.72)';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(124, 92, 255, 0.68)';
  ctx.lineWidth = 2;
  roundRect(ctx, 74, 74, width - 148, height - 148, 30);
  ctx.stroke();
  ctx.restore();

  const header = ctx.createLinearGradient(84, 84, width - 84, 158);
  header.addColorStop(0, 'rgba(124, 92, 255, 0.65)');
  header.addColorStop(0.55, 'rgba(247, 208, 120, 0.22)');
  header.addColorStop(1, 'rgba(255, 107, 61, 0.48)');

  roundRect(ctx, 94, 88, width - 188, 116, 28);
  ctx.fillStyle = header;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 132, 135, 25, '#f7d078', true);
  drawText(ctx, truncateText(characterName, 32), 132, 182, 48, '#ffffff', true, 760);

  drawGuildCrest(ctx, 1226, 146, 0.55);

  drawCenteredText(ctx, getRankLabel(mageRank), 930, 128, 250, 33, '#f7d078', true);
  drawCenteredText(ctx, `Mage de rang ${mageRank}`, 930, 170, 250, 22, '#ffffff', true);

  const avatarUrl = profile.avatarUrl || discordUser.displayAvatarURL({ extension: 'png', size: 512 });
  const avatar = await loadRemoteImage(avatarUrl);

  const avatarX = 108;
  const avatarY = 242;
  const avatarW = 360;
  const avatarH = 455;

  drawAvatarFrame(ctx, avatarX, avatarY, avatarW, avatarH);

  ctx.save();
  roundRect(ctx, avatarX + 16, avatarY + 16, avatarW - 32, avatarH - 32, 22);
  ctx.clip();

  if (avatar) {
    const scale = Math.max((avatarW - 32) / avatar.width, (avatarH - 32) / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    const drawX = avatarX + 16 + ((avatarW - 32) - drawW) / 2;
    const drawY = avatarY + 16 + ((avatarH - 32) - drawH) / 2;
    ctx.drawImage(avatar, drawX, drawY, drawW, drawH);
  } else {
    const fallback = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarW, avatarY + avatarH);
    fallback.addColorStop(0, '#1d2440');
    fallback.addColorStop(1, '#10091f');
    ctx.fillStyle = fallback;
    ctx.fillRect(avatarX + 16, avatarY + 16, avatarW - 32, avatarH - 32);
    drawCenteredText(ctx, 'Aucune image', avatarX + 16, avatarY + 230, avatarW - 32, 28, '#ffffff', true);
  }

  ctx.restore();

  roundRect(ctx, avatarX + 32, avatarY + avatarH - 78, avatarW - 64, 58, 18);
  ctx.fillStyle = 'rgba(9, 12, 26, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 208, 120, 0.42)';
  ctx.stroke();
  drawCenteredText(ctx, `Niveau RP ${level}`, avatarX + 32, avatarY + avatarH - 40, avatarW - 64, 27, '#f7d078', true);

  const infoX = 512;
  const infoY = 242;

  drawInfoBox(ctx, 'MAGIE', truncateText(magicType, 34), infoX, infoY, 380, 84);
  drawInfoBox(ctx, 'GUILDE', truncateText(guildName, 34), 918, infoY, 360, 84, '#8f7cff');

  drawInfoBox(ctx, 'TITRE', truncateText(title, 36), infoX, infoY + 106, 380, 84, '#ff7a45');
  drawInfoBox(ctx, 'ÂGE', truncateText(age, 24), 918, infoY + 106, 360, 84, '#38d5ff');

  roundRect(ctx, infoX, infoY + 224, 766, 128, 24);
  ctx.fillStyle = 'rgba(18, 21, 39, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 208, 120, 0.42)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'NIVEAU DE PUISSANCE', infoX + 28, infoY + 265, 22, '#c9bdf7', true);
  drawText(ctx, formatNumber(powerLevel), infoX + 28, infoY + 315, 52, '#f7d078', true);
  drawPowerGauge(ctx, infoX + 330, infoY + 286, 390, 28, powerLevel);

  roundRect(ctx, infoX, infoY + 380, 766, 96, 24);
  ctx.fillStyle = 'rgba(18, 21, 39, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(124, 92, 255, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, `Progression niveau ${level}`, infoX + 28, infoY + 420, 23, '#ffffff', true);
  drawText(ctx, `${formatNumber(xp)} / ${formatNumber(xpNeeded)} XP`, infoX + 520, infoY + 420, 22, '#c9bdf7', true);

  roundRect(ctx, infoX + 28, infoY + 442, 710, 24, 12);
  ctx.fillStyle = 'rgba(8, 10, 19, 0.9)';
  ctx.fill();

  const xpGradient = ctx.createLinearGradient(infoX + 28, infoY + 442, infoX + 738, infoY + 442);
  xpGradient.addColorStop(0, '#7c5cff');
  xpGradient.addColorStop(1, '#f7d078');

  roundRect(ctx, infoX + 28, infoY + 442, 710 * xpProgress, 24, 12);
  ctx.fillStyle = xpGradient;
  ctx.fill();

  const reputationLabel = getReputationLabel(reputation);

  drawStatPill(ctx, 'JEWELS', formatNumber(jewels), 512, 742, 205, '#f7d078');
  drawStatPill(ctx, 'RÉPUTATION', `${reputation} · ${reputationLabel}`, 738, 742, 300, '#ffffff');
  drawStatPill(ctx, 'RANG', mageRank, 1058, 742, 120, '#f7d078');
  drawStatPill(ctx, 'STATUT', 'Actif', 1198, 742, 110, '#38d5ff');

  roundRect(ctx, 108, 714, 360, 70, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.stroke();

  drawWrappedText(
    ctx,
    profile.description || 'Aucune description renseignée pour ce personnage.',
    132,
    742,
    310,
    24,
    2,
    19,
    '#efeaff',
  );

  ctx.save();
  ctx.strokeStyle = '#f7d078';
  ctx.lineWidth = 5;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(86, 150);
  ctx.lineTo(86, 92);
  ctx.lineTo(154, 92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 86, 150);
  ctx.lineTo(width - 86, 92);
  ctx.lineTo(width - 154, 92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(86, height - 150);
  ctx.lineTo(86, height - 92);
  ctx.lineTo(154, height - 92);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 86, height - 150);
  ctx.lineTo(width - 86, height - 92);
  ctx.lineTo(width - 154, height - 92);
  ctx.stroke();

  ctx.restore();

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-profil.png',
  });
}

module.exports = { createProfileCanvas };
