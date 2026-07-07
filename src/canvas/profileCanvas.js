const path = require('node:path');
const fs = require('node:fs');

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const { getXpNeeded } = require('../utils/xp');
const { getRankLabel } = require('../utils/ranks');
const { getReputationLabel } = require('../utils/reputation');
const { formatNumber, truncateText } = require('../utils/format');
const { getInventorySummary, getProfilePowerWithEquipment } = require('../utils/inventoryUtils');
const { getProfessionLabel } = require('../utils/professions');
const { drawCanvasIcon } = require('./iconRenderer');

const FONT_TITLE_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'crown_title', 'CROWNT.TTF');
const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus', 'Marcellus-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cinzel', 'static', 'Cinzel-Bold.ttf');
const EMOJI_FONT_PATHS = [
  'C:/Windows/Fonts/seguiemj.ttf',
  '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/opentype/noto/NotoColorEmoji.ttf',
];

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');

const FONT_TITLE = 'FairySlayerTitle';
const FONT_REGULAR = 'FairySlayerRegular';
const FONT_BOLD = 'FairySlayerBold';

let fontsLoaded = false;

function ensureFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;

  try {
    if (fs.existsSync(FONT_TITLE_PATH)) {
      GlobalFonts.registerFromPath(FONT_TITLE_PATH, FONT_TITLE);
      console.log('✅ Police Title chargée : CROWNT.TTF');
    } else {
      console.warn('⚠️ Police titre manquante : src/assets/fonts/crown_title/CROWNT.TTF');
    }

    if (fs.existsSync(FONT_REGULAR_PATH)) {
      GlobalFonts.registerFromPath(FONT_REGULAR_PATH, FONT_REGULAR);
      console.log('✅ Police Regular chargée : Marcellus-Regular.ttf');
    } else {
      console.warn('⚠️ Police regular manquante : src/assets/fonts/Marcellus/Marcellus-Regular.ttf');
    }

    if (fs.existsSync(FONT_BOLD_PATH)) {
      GlobalFonts.registerFromPath(FONT_BOLD_PATH, FONT_BOLD);
      console.log('✅ Police Bold chargée : Cinzel-Bold.ttf');
    } else {
      console.warn('⚠️ Police bold manquante : src/assets/fonts/Cinzel/static/Cinzel-Bold.ttf');
    }

    const emojiPath = EMOJI_FONT_PATHS.find((fontPath) => fs.existsSync(fontPath));
    if (emojiPath) GlobalFonts.registerFromPath(emojiPath, 'FairyProfileEmoji');
  } catch (error) {
    console.error('❌ Erreur chargement polices Canvas :', error);
  }
}

function getFontFamily(style = 'regular') {
  if (style === 'title') return FONT_TITLE;
  if (style === 'bold') return FONT_BOLD;
  return FONT_REGULAR;
}

function setFont(ctx, size = 24, style = 'regular') {
  ensureFonts();

  const family = getFontFamily(style);

  ctx.font = `${size}px "${family}", "FairyProfileEmoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function drawText(ctx, text, x, y, size = 24, color = '#ffffff', style = 'regular', maxWidth = undefined) {
  ctx.save();

  ctx.fillStyle = color;
  setFont(ctx, size, style);

  const value = String(text ?? '');

  if (typeof maxWidth === 'number') {
    ctx.fillText(value, x, y, maxWidth);
  } else {
    ctx.fillText(value, x, y);
  }

  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, width, size = 24, color = '#ffffff', style = 'regular') {
  ctx.save();

  ctx.fillStyle = color;
  setFont(ctx, size, style);
  ctx.textAlign = 'center';

  ctx.fillText(String(text ?? ''), x + width / 2, y);

  ctx.restore();
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, size = 20, color = '#ffffff') {
  ctx.save();

  ctx.fillStyle = color;
  setFont(ctx, size, 'regular');

  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const textWidth = ctx.measureText(testLine).width;

    if (textWidth > maxWidth && currentLine) {
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
      line = `${line.slice(0, Math.max(0, line.length - 2))}…`;
    }

    ctx.fillText(line, x, y + i * lineHeight);
  }

  ctx.restore();
}

function cutCornerPath(ctx, x, y, w, h, cut = 14) {
  const corner = Math.max(4, Math.min(cut, w / 4, h / 4));
  ctx.beginPath();
  ctx.moveTo(x + corner, y);
  ctx.lineTo(x + w - corner, y);
  ctx.lineTo(x + w, y + corner);
  ctx.lineTo(x + w, y + h - corner);
  ctx.lineTo(x + w - corner, y + h);
  ctx.lineTo(x + corner, y + h);
  ctx.lineTo(x, y + h - corner);
  ctx.lineTo(x, y + corner);
  ctx.closePath();
}

function drawRivet(ctx, x, y, color, radius = 3) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawRpgPanel(ctx, x, y, w, h, options = {}) {
  const {
    accent = '#ffcf63',
    cut = 14,
    fill = null,
    shadow = true,
    rivets = true,
  } = options;

  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.58)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 7;
  }

  cutCornerPath(ctx, x, y, w, h, cut);
  if (fill) {
    ctx.fillStyle = fill;
  } else {
    const panelGradient = ctx.createLinearGradient(x, y, x, y + h);
    panelGradient.addColorStop(0, 'rgba(18, 25, 48, 0.97)');
    panelGradient.addColorStop(0.55, 'rgba(8, 13, 29, 0.96)');
    panelGradient.addColorStop(1, 'rgba(5, 9, 21, 0.98)');
    ctx.fillStyle = panelGradient;
  }
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = `${accent}c9`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  cutCornerPath(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(4, cut - 4));
  ctx.strokeStyle = 'rgba(255,223,145,0.18)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = `${accent}7a`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + cut + 10, y + 5);
  ctx.lineTo(x + Math.min(w * 0.32, 120), y + 5);
  ctx.moveTo(x + w - cut - 10, y + h - 5);
  ctx.lineTo(x + w - Math.min(w * 0.32, 120), y + h - 5);
  ctx.stroke();

  if (rivets && w >= 140 && h >= 60) {
    drawRivet(ctx, x + cut + 7, y + 8, accent, 2.5);
    drawRivet(ctx, x + w - cut - 7, y + h - 8, accent, 2.5);
  }

  ctx.restore();
}

async function loadLocalImage(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return await loadImage(filePath);
  } catch (error) {
    console.warn(`⚠️ Image locale impossible à charger : ${filePath}`, error.message);
    return null;
  }
}

function normalizeProfileImageUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname === 'media.discordapp.net'
      || parsed.hostname === 'cdn.discordapp.com'
    ) {
      return `https://cdn.discordapp.com${parsed.pathname}`;
    }

    return url;
  } catch (_) {
    return url;
  }
}

function buildImageCandidateUrls(url) {
  const normalized = normalizeProfileImageUrl(url);

  if (!normalized) return [];

  const candidates = new Set([url, normalized]);

  try {
    const parsed = new URL(normalized);

    if (parsed.hostname === 'cdn.discordapp.com') {
      const pngVersion = new URL(normalized);
      pngVersion.searchParams.set('format', 'png');
      pngVersion.searchParams.set('quality', 'lossless');
      candidates.add(pngVersion.toString());

      const jpgVersion = new URL(normalized);
      jpgVersion.searchParams.set('format', 'jpg');
      jpgVersion.searchParams.set('quality', 'lossless');
      candidates.add(jpgVersion.toString());
    }
  } catch (_) {
    // ignore
  }

  return [...candidates];
}

async function loadRemoteImage(url) {
  if (!url) return null;

  const candidates = buildImageCandidateUrls(url);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'Fairy-Slayer/1.0',
        },
      });

      if (!response.ok) continue;

      const buffer = Buffer.from(await response.arrayBuffer());
      return await loadImage(buffer);
    } catch (_) {
      // On tente l'URL candidate suivante.
    }
  }

  return null;
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
  ctx.globalAlpha = 0.22;
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

  for (let i = 0; i < 12; i += 1) {
    const angle = (Math.PI * 2 * i) / 12;
    const x1 = Math.cos(angle) * radius * 0.82;
    const y1 = Math.sin(angle) * radius * 0.82;
    const x2 = Math.cos(angle) * radius;
    const y2 = Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawInfoBox(ctx, label, value, x, y, w, h, accent = '#ffcf63', icon = 'sparkle') {
  ctx.save();

  drawRpgPanel(ctx, x, y, w, h, { accent, cut: 13 });

  ctx.beginPath();
  ctx.moveTo(x, y + 13);
  ctx.lineTo(x + 9, y + 4);
  ctx.lineTo(x + 9, y + h - 4);
  ctx.lineTo(x, y + h - 13);
  ctx.closePath();
  ctx.fillStyle = accent;
  ctx.fill();

  drawCanvasIcon(ctx, icon, x + 18, y + 8, 22, accent);
  drawText(ctx, label, x + 48, y + 10, 14, '#cec6f6', 'bold');
  drawText(ctx, value, x + 20, y + 35, 22, '#ffffff', 'bold', w - 34);

  ctx.restore();
}

function drawBar(ctx, x, y, w, h, progress, colorA = '#7f5cff', colorB = '#ffcf63') {
  const p = Math.max(0.02, Math.min(1, progress));

  cutCornerPath(ctx, x, y, w, h, Math.min(8, h / 3));
  ctx.fillStyle = 'rgba(7, 10, 20, 0.95)';
  ctx.fill();

  const gradient = ctx.createLinearGradient(x, y, x + w, y);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);

  cutCornerPath(ctx, x + 2, y + 2, Math.max(8, (w - 4) * p), h - 4, Math.min(6, h / 4));
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;

  cutCornerPath(ctx, x, y, w, h, Math.min(8, h / 3));
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  for (let segment = 1; segment < 10; segment += 1) {
    const segmentX = x + (w * segment) / 10;
    ctx.beginPath();
    ctx.moveTo(segmentX, y + 4);
    ctx.lineTo(segmentX, y + h - 4);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEmptyAvatarPlaceholder(ctx, x, y, w, h) {
  const fallback = ctx.createLinearGradient(x, y, x + w, y + h);
  fallback.addColorStop(0, '#21294c');
  fallback.addColorStop(1, '#101320');

  ctx.fillStyle = fallback;
  ctx.fillRect(x, y, w, h);

  drawCenteredText(ctx, 'Aucune image', x, y + 145, w, 28, '#ffffff', 'bold');
  drawCenteredText(ctx, 'définie', x, y + 183, w, 28, '#ffffff', 'bold');
  drawCenteredText(ctx, 'Utilise Modifier l’image', x, y + 245, w, 18, '#cec6f6', 'regular');
}

function getShortSlotName(item, fallback) {
  if (!item) return fallback;

  const bonus = Number(item.powerBonus || 0);
  const bonusText = bonus > 0 ? ` +${bonus}` : '';

  return truncateText(`${item.name}${bonusText}`, 23);
}

async function getEquippedProfileItems(profile) {
  if (!profile?._id) {
    return {
      arme: 'Aucune',
      tenue: 'Aucune',
      accessoire: 'Aucun',
      lacrima: 'Aucune',
      bonus: 0,
    };
  }

  try {
    const summary = await getInventorySummary(profile._id);
    const slots = summary.equippedSlots || {};

    return {
      arme: getShortSlotName(slots.arme, 'Aucune'),
      tenue: getShortSlotName(slots.tenue, 'Aucune'),
      accessoire: getShortSlotName(slots.accessoire, 'Aucun'),
      lacrima: getShortSlotName(slots.lacrima, 'Aucune'),
      bonus: Number(summary.equippedPowerBonus || 0),
    };
  } catch (error) {
    console.warn('⚠️ Impossible de récupérer les objets équipés du profil :', error.message);

    return {
      arme: 'Indisponible',
      tenue: 'Indisponible',
      accessoire: 'Indisponible',
      lacrima: 'Indisponible',
      bonus: 0,
    };
  }
}

async function createProfileCanvas(profile, discordUser) {
  ensureFonts();

  const width = 1400;
  const height = 820;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const characterName = profile?.characterName || 'Personnage inconnu';
  const magicType = profile?.magicType || 'Magie inconnue';
  const guildName = profile?.guildName || 'Guilde inconnue';
  const title = profile?.title || 'Aucun titre';
  const age = profile?.age || 'Inconnu';
  const gender = profile?.gender || 'Non précisé';
  const professionLabel = getProfessionLabel(profile?.profession);
  const professionIcon = {
    alchimiste: 'flask',
    forgeron: 'hammer',
    armurier: 'shield',
    redacteur: 'book',
    fermier: 'sparkle',
    marchand: 'coin',
    barde: 'music',
    tresorier: 'gem',
  }[profile?.profession] || 'sparkle';
  const description = profile?.description || 'Aucune description renseignée.';
  const mageRank = profile?.mageRank || 'C';
  const basePowerLevel = Number(profile?.powerLevel || 0);
  const powerInfo = await getProfilePowerWithEquipment(profile);
  const powerLevel = Number(powerInfo.totalPower || basePowerLevel);
  const equipmentBonus = Number(powerInfo.equipmentBonus || 0);
  const level = Number(profile?.level || 1);
  const xp = Number(profile?.xp || 0);
  const jewels = Number(profile?.jewels || 0);
  const reputation = Number(profile?.reputation || 0);
  const xpNeeded = getXpNeeded(level);
  const xpProgress = xpNeeded > 0 ? xp / xpNeeded : 0;
  const equippedItems = await getEquippedProfileItems(profile);

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#13081d');
  bg.addColorStop(0.35, '#22123d');
  bg.addColorStop(0.68, '#121c2f');
  bg.addColorStop(1, '#41151f');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 130, 120, 240, '#7f5cff', 0.30);
  drawGlow(ctx, 1240, 150, 260, '#ffcf63', 0.18);
  drawGlow(ctx, 1180, 740, 280, '#ff7a4e', 0.14);
  drawGlow(ctx, 230, 710, 250, '#3bd6ff', 0.10);

  for (let i = 0; i < 85; i += 1) {
    const px = Math.random() * width;
    const py = Math.random() * height;
    const r = Math.random() * 2.3 + 0.8;

    ctx.save();
    ctx.globalAlpha = 0.15 + Math.random() * 0.45;
    ctx.fillStyle = i % 3 === 0 ? '#ffcf63' : '#d8cfff';

    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMagicCircle(ctx, 1180, 220, 110, '#ffcf63');
  drawMagicCircle(ctx, 180, 705, 96, '#7f5cff');

  drawRpgPanel(ctx, 4, 4, width - 8, height - 8, {
    accent: '#ffcf63', cut: 30, fill: 'rgba(8, 12, 24, 0.86)', rivets: true,
  });

  cutCornerPath(ctx, 20, 20, width - 40, height - 40, 23);
  ctx.strokeStyle = 'rgba(127, 92, 255, 0.52)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const headerGradient = ctx.createLinearGradient(60, 35, width - 60, 160);
  headerGradient.addColorStop(0, 'rgba(127, 92, 255, 0.45)');
  headerGradient.addColorStop(0.55, 'rgba(255, 207, 99, 0.16)');
  headerGradient.addColorStop(1, 'rgba(255, 122, 78, 0.35)');

  drawRpgPanel(ctx, 60, 35, width - 120, 125, {
    accent: '#ffcf63', cut: 20, fill: headerGradient, rivets: true,
  });

  drawText(ctx, 'FAIRY SLAYER', 92, 45, 36, '#ffcf63', 'title');
  drawText(ctx, truncateText(characterName, 34), 92, 89, 37, '#ffffff', 'bold');

  drawText(ctx, `Mage de rang ${mageRank}`, 870, 51, 21, '#ffffff', 'bold');
  drawText(ctx, getRankLabel(mageRank), 870, 79, 33, '#ffcf63', 'bold');
  drawCanvasIcon(ctx, professionIcon, 870, 117, 22, '#e8e7ff');
  drawText(ctx, `Métier : ${professionLabel}`, 900, 120, 18, '#e8e7ff', 'regular');

  const logo = await loadLocalImage(LOGO_PATH);

  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.drawImage(logo, 1190, 40, 116, 116);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.drawImage(logo, 980, 260, 250, 250);
    ctx.restore();
  } else {
    console.warn('⚠️ Logo manquant : src/assets/fairy-slayer-logo.png');
  }

  const avatarUrl = profile?.avatarUrl || null;
  const avatar = avatarUrl ? await loadRemoteImage(avatarUrl) : null;

  const avatarX = 80;
  const avatarY = 180;
  const avatarW = 340;
  const avatarH = 420;

  drawRpgPanel(ctx, avatarX, avatarY, avatarW, avatarH, {
    accent: '#ffcf63', cut: 22, rivets: true,
  });

  cutCornerPath(ctx, avatarX + 12, avatarY + 12, avatarW - 24, avatarH - 24, 15);
  ctx.save();
  ctx.clip();

  if (avatar) {
    const innerW = avatarW - 24;
    const innerH = avatarH - 24;

    const scale = Math.max(innerW / avatar.width, innerH / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    const drawX = avatarX + 12 + (innerW - drawW) / 2;
    const drawY = avatarY + 12 + (innerH - drawH) / 2;

    ctx.drawImage(avatar, drawX, drawY, drawW, drawH);
  } else {
    drawEmptyAvatarPlaceholder(ctx, avatarX + 12, avatarY + 12, avatarW - 24, avatarH - 24);
  }

  ctx.restore();

  drawRpgPanel(ctx, avatarX + 28, avatarY + avatarH - 60, avatarW - 56, 48, {
    accent: '#ffcf63', cut: 10, fill: 'rgba(7, 10, 20, 0.88)', rivets: false, shadow: false,
  });

  drawCenteredText(ctx, `Niveau RP ${level}`, avatarX + 28, avatarY + avatarH - 47, avatarW - 56, 22, '#ffcf63', 'bold');

  drawInfoBox(ctx, 'MAGIE', truncateText(magicType, 26), 460, 180, 390, 78, '#ff7a4e', 'magic');
  drawInfoBox(ctx, 'GUILDE', truncateText(guildName, 26), 880, 180, 400, 78, '#3bd6ff', 'guild');

  drawInfoBox(ctx, 'TITRE', truncateText(title, 30), 460, 278, 390, 78, '#ffcf63', 'crown');
  drawInfoBox(ctx, 'ÂGE / GENRE', truncateText(`${age} · ${gender}`, 30), 880, 278, 400, 78, '#7f5cff', 'user');

  drawRpgPanel(ctx, 460, 376, 820, 102, { accent: '#ffcf63', cut: 16 });

  drawCanvasIcon(ctx, 'sword', 486, 389, 22, '#cec6f6');
  drawText(ctx, 'NIVEAU DE PUISSANCE', 516, 392, 18, '#cec6f6', 'bold');
  drawText(ctx, formatNumber(powerLevel), 486, 420, 42, '#ffcf63', 'bold');

  const bonusLabel = equipmentBonus > 0
    ? `Base ${formatNumber(basePowerLevel)} + équipement ${formatNumber(equipmentBonus)}`
    : `Base ${formatNumber(basePowerLevel)}`;

  drawText(ctx, bonusLabel, 486, 461, 14, '#cec6f6', 'bold');
  drawBar(ctx, 750, 428, 490, 26, Math.min(1, powerLevel / 10000), '#7f5cff', '#ff7a4e');

  drawRpgPanel(ctx, 460, 498, 820, 92, { accent: '#7f5cff', cut: 16 });

  drawCanvasIcon(ctx, 'chart', 486, 511, 22, '#ffffff');
  drawText(ctx, `Progression du niveau ${level}`, 516, 514, 20, '#ffffff', 'bold');
  drawText(ctx, `${formatNumber(xp)} / ${formatNumber(xpNeeded)} XP`, 975, 514, 17, '#cec6f6', 'bold');
  drawBar(ctx, 486, 552, 754, 20, xpProgress, '#7f5cff', '#ffcf63');

  drawRpgPanel(ctx, 80, 620, 750, 165, { accent: '#3bd6ff', cut: 14 });

  drawCanvasIcon(ctx, 'book', 102, 630, 18, '#cec6f6');
  drawText(ctx, 'DESCRIPTION', 128, 633, 14, '#cec6f6', 'bold');
  drawWrappedText(ctx, description, 102, 655, 705, 19, 4, 16, '#ffffff');

  ctx.strokeStyle = 'rgba(59,214,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(102, 736);
  ctx.lineTo(807, 736);
  ctx.stroke();

  drawText(
    ctx,
    `Arme : ${equippedItems.arme}   |   Tenue : ${equippedItems.tenue}`,
    102,
    744,
    13,
    '#ffcf63',
    'bold',
    705,
  );

  drawText(
    ctx,
    `Accessoire : ${equippedItems.accessoire}   |   Lacrima : ${equippedItems.lacrima}`,
    102,
    765,
    13,
    '#3bd6ff',
    'bold',
    705,
  );

  drawInfoBox(ctx, 'JOYAUX', formatNumber(jewels), 850, 650, 180, 100, '#ffcf63', 'coin');

  drawInfoBox(
    ctx,
    'RÉPUTATION',
    `${reputation} · ${getReputationLabel(reputation)}`,
    1050,
    650,
    210,
    100,
    '#7f5cff',
    'star',
  );

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-profil.png',
  });
}

module.exports = {
  createProfileCanvas,
};
