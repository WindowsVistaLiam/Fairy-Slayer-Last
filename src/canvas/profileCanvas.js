const path = require('node:path');
const fs = require('node:fs');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { getXpNeeded } = require('../utils/xp');
const { getRankLabel } = require('../utils/ranks');
const { getReputationLabel } = require('../utils/reputation');
const { formatNumber, truncateText } = require('../utils/format');

let regularFontFamily = 'sans-serif';
let boldFontFamily = 'sans-serif';

function tryRegisterFont(filePath, familyName, bold = false) {
  try {
    if (fs.existsSync(filePath)) {
      GlobalFonts.registerFromPath(filePath, familyName);
      if (bold) boldFontFamily = familyName;
      else regularFontFamily = familyName;
      return true;
    }
  } catch (_) {
    // ignore
  }
  return false;
}

// Windows
tryRegisterFont('C:/Windows/Fonts/arial.ttf', 'FairySlayerRegular');
tryRegisterFont('C:/Windows/Fonts/arialbd.ttf', 'FairySlayerBold', true);

// Linux / Railway fallback
tryRegisterFont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'FairySlayerRegularLinux');
tryRegisterFont('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'FairySlayerBoldLinux', true);

function setFont(ctx, size, bold = false) {
  const family = bold ? boldFontFamily : regularFontFamily;
  ctx.font = `${size}px ${family}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function drawText(ctx, text, x, y, size = 24, color = '#ffffff', bold = false, maxWidth) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  if (typeof maxWidth === 'number') {
    ctx.fillText(String(text ?? ''), x, y, maxWidth);
  } else {
    ctx.fillText(String(text ?? ''), x, y);
  }
  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, width, size = 24, color = '#ffffff', bold = false) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  ctx.textAlign = 'center';
  ctx.fillText(String(text ?? ''), x + width / 2, y);
  ctx.restore();
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

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, size = 20, color = '#ffffff') {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, false);

  const content = String(text || '');
  const words = content.split(/\s+/).filter(Boolean);

  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }

    if (lines.length >= maxLines) break;
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i];

    if (i === maxLines - 1 && words.length > line.split(/\s+/).length) {
      if (line.length > 2) line = `${line.slice(0, line.length - 2)}…`;
    }

    ctx.fillText(line, x, y + i * lineHeight);
  }

  ctx.restore();
}

async function loadRemoteImage(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Fairy-Slayer/1.0',
      },
    });

    if (!response.ok) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    return await loadImage(buffer);
  } catch (_) {
    return null;
  }
}

async function loadLocalImage(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return await loadImage(filePath);
  } catch (_) {
    return null;
  }
}

function drawGlow(ctx, x, y, radius, color, alpha = 0.35) {
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

function drawMagicCircle(ctx, x, y, radius, color = '#ffcf63') {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 2;

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

  ctx.restore();
}

function drawInfoBox(ctx, label, value, x, y, w, h, accent = '#ffcf63') {
  ctx.save();

  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 207, 99, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  roundRect(ctx, x, y, 8, h, 8);
  ctx.fillStyle = accent;
  ctx.fill();

  drawText(ctx, label, x + 20, y + 14, 16, '#cfc8f7', true);
  drawText(ctx, value, x + 20, y + 38, 24, '#ffffff', true, w - 35);

  ctx.restore();
}

function drawBar(ctx, x, y, w, h, progress, colorA = '#7f5cff', colorB = '#ffcf63') {
  const p = Math.max(0.02, Math.min(1, progress));

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(7, 10, 20, 0.95)';
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);

  roundRect(ctx, x, y, w * p, h, h / 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.stroke();
}

async function createProfileCanvas(profile, discordUser) {
  const width = 1400;
  const height = 820;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const characterName = profile?.characterName || 'Personnage inconnu';
  const magicType = profile?.magicType || 'Magie inconnue';
  const guildName = profile?.guildName || 'Guilde inconnue';
  const title = profile?.title || 'Aucun titre';
  const age = profile?.age || 'Inconnu';
  const description = profile?.description || 'Aucune description renseignée.';
  const mageRank = profile?.mageRank || 'C';
  const powerLevel = Number(profile?.powerLevel || 0);
  const level = Number(profile?.level || 1);
  const xp = Number(profile?.xp || 0);
  const jewels = Number(profile?.jewels || 0);
  const reputation = Number(profile?.reputation || 0);
  const xpNeeded = getXpNeeded(level);
  const xpProgress = xpNeeded > 0 ? xp / xpNeeded : 0;

  // Fond général
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#12091c');
  bg.addColorStop(0.35, '#1d1338');
  bg.addColorStop(0.68, '#111b2e');
  bg.addColorStop(1, '#3b1420');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 120, 110, 240, '#7f5cff', 0.30);
  drawGlow(ctx, 1240, 140, 260, '#ffcf63', 0.18);
  drawGlow(ctx, 1200, 760, 280, '#ff7a4e', 0.15);
  drawGlow(ctx, 230, 720, 250, '#3bd6ff', 0.12);

  // Particules
  for (let i = 0; i < 90; i += 1) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const r = Math.random() * 2.6 + 0.8;
    ctx.save();
    ctx.globalAlpha = 0.15 + Math.random() * 0.45;
    ctx.fillStyle = i % 3 === 0 ? '#ffcf63' : '#d8cfff';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawMagicCircle(ctx, 1190, 220, 115, '#ffcf63');
  drawMagicCircle(ctx, 190, 710, 100, '#7f5cff');

  // Carte principale
  roundRect(ctx, 50, 50, width - 100, height - 100, 36);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.84)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.70)';
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, 68, 68, width - 136, height - 136, 28);
  ctx.strokeStyle = 'rgba(127, 92, 255, 0.52)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Header
  const headerGradient = ctx.createLinearGradient(90, 85, width - 90, 160);
  headerGradient.addColorStop(0, 'rgba(127, 92, 255, 0.45)');
  headerGradient.addColorStop(0.55, 'rgba(255, 207, 99, 0.16)');
  headerGradient.addColorStop(1, 'rgba(255, 122, 78, 0.35)');

  roundRect(ctx, 92, 88, width - 184, 110, 24);
  ctx.fillStyle = headerGradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 122, 108, 22, '#ffcf63', true);
  drawText(ctx, truncateText(characterName, 34), 122, 136, 42, '#ffffff', true);

  drawText(ctx, `Mage de rang ${mageRank}`, 885, 106, 22, '#ffffff', true);
  drawText(ctx, getRankLabel(mageRank), 885, 136, 34, '#ffcf63', true);

  // Logo
  const logoPath = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');
  const logo = await loadLocalImage(logoPath);

  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(logo, 1180, 92, 110, 110);
    ctx.restore();

    // watermark
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.drawImage(logo, 980, 260, 260, 260);
    ctx.restore();
  }

  // Avatar
  const avatarUrl =
    profile?.avatarUrl ||
    discordUser.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });

  const avatar = await loadRemoteImage(avatarUrl);

  const avatarX = 100;
  const avatarY = 240;
  const avatarW = 320;
  const avatarH = 430;

  roundRect(ctx, avatarX, avatarY, avatarW, avatarH, 28);
  ctx.fillStyle = 'rgba(14, 19, 36, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();

  roundRect(ctx, avatarX + 12, avatarY + 12, avatarW - 24, avatarH - 24, 20);
  ctx.save();
  ctx.clip();

  if (avatar) {
    const scale = Math.max((avatarW - 24) / avatar.width, (avatarH - 24) / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    const drawX = avatarX + 12 + ((avatarW - 24) - drawW) / 2;
    const drawY = avatarY + 12 + ((avatarH - 24) - drawH) / 2;
    ctx.drawImage(avatar, drawX, drawY, drawW, drawH);
  } else {
    const fallback = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarW, avatarY + avatarH);
    fallback.addColorStop(0, '#20284a');
    fallback.addColorStop(1, '#101320');
    ctx.fillStyle = fallback;
    ctx.fillRect(avatarX + 12, avatarY + 12, avatarW - 24, avatarH - 24);
    drawCenteredText(ctx, 'Aucune image', avatarX + 12, avatarY + 185, avatarW - 24, 26, '#ffffff', true);
  }

  ctx.restore();

  roundRect(ctx, avatarX + 28, avatarY + avatarH - 66, avatarW - 56, 48, 16);
  ctx.fillStyle = 'rgba(7, 10, 20, 0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.35)';
  ctx.stroke();
  drawCenteredText(ctx, `Niveau RP ${level}`, avatarX + 28, avatarY + avatarH - 54, avatarW - 56, 22, '#ffcf63', true);

  // Infos principales
  drawInfoBox(ctx, 'MAGIE', truncateText(magicType, 26), 470, 240, 380, 78, '#ff7a4e');
  drawInfoBox(ctx, 'GUILDE', truncateText(guildName, 26), 880, 240, 380, 78, '#3bd6ff');

  drawInfoBox(ctx, 'TITRE', truncateText(title, 30), 470, 338, 380, 78, '#ffcf63');
  drawInfoBox(ctx, 'ÂGE', truncateText(age, 18), 880, 338, 380, 78, '#7f5cff');

  // Puissance
  roundRect(ctx, 470, 440, 790, 112, 22);
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'NIVEAU DE PUISSANCE', 496, 456, 18, '#cec6f6', true);
  drawText(ctx, formatNumber(powerLevel), 496, 484, 44, '#ffcf63', true);
  drawBar(ctx, 760, 488, 460, 26, Math.min(1, powerLevel / 10000), '#7f5cff', '#ff7a4e');

  // XP
  roundRect(ctx, 470, 572, 790, 98, 22);
  ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(127, 92, 255, 0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, `Progression du niveau ${level}`, 496, 590, 22, '#ffffff', true);
  drawText(ctx, `${formatNumber(xp)} / ${formatNumber(xpNeeded)} XP`, 980, 592, 18, '#cec6f6', true);
  drawBar(ctx, 496, 628, 724, 20, xpProgress, '#7f5cff', '#ffcf63');

  // Description
  roundRect(ctx, 100, 700, 720, 78, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.stroke();

  drawText(ctx, 'DESCRIPTION', 122, 714, 16, '#cec6f6', true);
  drawWrappedText(ctx, description, 122, 738, 675, 22, 2, 19, '#ffffff');

  // Stats bas
  drawInfoBox(ctx, 'JEWELS', formatNumber(jewels), 850, 700, 180, 78, '#ffcf63');
  drawInfoBox(
    ctx,
    'RÉPUTATION',
    `${reputation} · ${getReputationLabel(reputation)}`,
    1050,
    700,
    210,
    78,
    '#7f5cff'
  );

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-profil.png',
  });
}

module.exports = { createProfileCanvas };