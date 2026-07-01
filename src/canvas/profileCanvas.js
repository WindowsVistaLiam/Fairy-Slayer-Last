const path = require('node:path');
const fs = require('node:fs');

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const { getXpNeeded } = require('../utils/xp');
const { getRankLabel } = require('../utils/ranks');
const { getReputationLabel } = require('../utils/reputation');
const { formatNumber, truncateText } = require('../utils/format');

const FONT_TITLE_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'crown_title', 'CROWNT.TTF');
const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus', 'Marcellus-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cinzel', 'static', 'Cinzel-Bold.ttf');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');

const FONT_TITLE = 'FairySlayerTitle';
const FONT_REGULAR = 'FairySlayerRegular';
const FONT_BOLD = 'FairySlayerBold';

function registerFontSafe(filePath, familyName, label) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Police introuvable ${label} : ${filePath}`);
      return false;
    }

    GlobalFonts.registerFromPath(filePath, familyName);
    console.log(`✅ Police ${label} chargée : ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.warn(`⚠️ Impossible de charger la police ${label} : ${error.message}`);
    return false;
  }
}

registerFontSafe(FONT_TITLE_PATH, FONT_TITLE, 'Title');
registerFontSafe(FONT_REGULAR_PATH, FONT_REGULAR, 'Regular');
registerFontSafe(FONT_BOLD_PATH, FONT_BOLD, 'Bold');

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

function drawText(ctx, text, x, y, size = 28, color = '#ffffff', variant = 'regular') {
  const family = variant === 'title'
    ? FONT_TITLE
    : variant === 'bold'
      ? FONT_BOLD
      : FONT_REGULAR;

  ctx.fillStyle = color;
  ctx.font = `${size}px "${family}"`;
  ctx.fillText(String(text || ''), x, y);
}

function drawTextRight(ctx, text, x, y, size = 28, color = '#ffffff', variant = 'regular') {
  const family = variant === 'title'
    ? FONT_TITLE
    : variant === 'bold'
      ? FONT_BOLD
      : FONT_REGULAR;

  ctx.fillStyle = color;
  ctx.font = `${size}px "${family}"`;
  ctx.textAlign = 'right';
  ctx.fillText(String(text || ''), x, y);
  ctx.textAlign = 'left';
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines, size = 22, color = '#ffffff') {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = '';

  ctx.font = `${size}px "${FONT_REGULAR}"`;

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

  ctx.fillStyle = color;

  lines.slice(0, maxLines).forEach((line, index) => {
    let finalLine = line;

    if (index === maxLines - 1 && words.length > line.split(/\s+/).length) {
      finalLine = truncateText(line, 80);
    }

    ctx.fillText(finalLine, x, y + index * lineHeight);
  });
}

async function loadLocalImage(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Image locale introuvable : ${filePath}`);
      return null;
    }

    return await loadImage(filePath);
  } catch (error) {
    console.warn(`⚠️ Impossible de charger l'image locale : ${error.message}`);
    return null;
  }
}

function normalizeProfileImageUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);

    if (parsed.hostname === 'media.discordapp.net') {
      parsed.hostname = 'cdn.discordapp.com';
    }

    return parsed.toString();
  } catch (_) {
    return url;
  }
}

function buildImageCandidateUrls(url) {
  const normalized = normalizeProfileImageUrl(url);

  if (!normalized) return [];

  const candidates = new Set();

  candidates.add(url);
  candidates.add(normalized);

  try {
    const parsed = new URL(normalized);

    if (parsed.hostname === 'cdn.discordapp.com') {
      const originalWithParams = parsed.toString();
      candidates.add(originalWithParams);

      const pngVersion = new URL(originalWithParams);
      pngVersion.searchParams.set('format', 'png');
      pngVersion.searchParams.set('quality', 'lossless');
      candidates.add(pngVersion.toString());

      const jpgVersion = new URL(originalWithParams);
      jpgVersion.searchParams.set('format', 'jpg');
      jpgVersion.searchParams.set('quality', 'lossless');
      candidates.add(jpgVersion.toString());

      const webpVersion = new URL(originalWithParams);
      webpVersion.searchParams.set('format', 'webp');
      webpVersion.searchParams.set('quality', 'lossless');
      candidates.add(webpVersion.toString());
    }
  } catch (_) {
    // URL invalide, on garde seulement l’URL brute.
  }

  return [...candidates];
}

async function loadRemoteImage(url) {
  if (!url) return null;

  const candidates = buildImageCandidateUrls(url);

  for (const candidate of candidates) {
    try {
      try {
        const directImage = await loadImage(candidate);

        if (directImage) {
          console.log(`✅ Image distante chargée directement : ${candidate}`);
          return directImage;
        }
      } catch (_) {
        // On tente ensuite via fetch.
      }

      const response = await fetch(candidate, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'Fairy-Slayer/1.0',
          Accept: 'image/avif,image/webp,image/apng,image/png,image/jpeg,image/jpg,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ Échec HTTP image distante (${response.status}) : ${candidate}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';

      if (!contentType.startsWith('image/')) {
        console.warn(`⚠️ URL non-image retournée : ${candidate} (${contentType})`);
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const image = await loadImage(buffer);

      if (image) {
        console.log(`✅ Image distante chargée via fetch : ${candidate}`);
        return image;
      }
    } catch (error) {
      console.warn(`⚠️ Impossible de charger l'image distante : ${candidate} -> ${error.message}`);
    }
  }

  console.warn(`❌ Aucune version de l'image n'a pu être chargée : ${url}`);
  return null;
}

function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#070813');
  gradient.addColorStop(0.45, '#111428');
  gradient.addColorStop(1, '#321320');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 80; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = 1.2 + Math.random() * 2.8;

    ctx.globalAlpha = 0.08 + Math.random() * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#d9d2ff';
    ctx.fill();
  }

  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#4e8cff';
  ctx.lineWidth = 2;

  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(200 + i * 470, 710 - i * 230, 90 + i * 28, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawMainFrame(ctx, width, height) {
  roundRect(ctx, 48, 48, width - 96, height - 96, 38);
  ctx.fillStyle = 'rgba(8, 11, 24, 0.82)';
  ctx.fill();
  ctx.strokeStyle = '#4e9bff';
  ctx.lineWidth = 4;
  ctx.stroke();

  roundRect(ctx, 72, 72, width - 144, height - 144, 24);
  ctx.strokeStyle = 'rgba(255, 211, 91, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 211, 91, 0.8)';
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(78, 158);
  ctx.lineTo(78, 82);
  ctx.lineTo(158, 82);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 158, 82);
  ctx.lineTo(width - 78, 82);
  ctx.lineTo(width - 78, 158);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(78, height - 158);
  ctx.lineTo(78, height - 78);
  ctx.lineTo(158, height - 78);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 158, height - 78);
  ctx.lineTo(width - 78, height - 78);
  ctx.lineTo(width - 78, height - 158);
  ctx.stroke();
}

function drawHeader(ctx, profile, logo) {
  const gradient = ctx.createLinearGradient(90, 88, 1310, 208);
  gradient.addColorStop(0, 'rgba(105, 72, 190, 0.72)');
  gradient.addColorStop(0.55, 'rgba(42, 39, 57, 0.88)');
  gradient.addColorStop(1, 'rgba(125, 57, 36, 0.72)');

  roundRect(ctx, 90, 88, 1220, 120, 24);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 120, 125, 32, '#ffd966', 'title');
  drawText(ctx, truncateText(profile.characterName, 28), 120, 170, 36, '#ffffff', 'bold');

  drawTextRight(ctx, 'MAGE DE RANG', 1035, 126, 13, '#f1d784', 'bold');
  drawTextRight(ctx, getRankLabel(profile.mageRank), 1035, 150, 24, '#ffd966', 'bold');

  if (logo) {
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.drawImage(logo, 1190, 98, 100, 100);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.drawImage(logo, 950, 255, 300, 300);
    ctx.restore();
  }
}

function drawAvatar(ctx, avatar) {
  const x = 118;
  const y = 238;
  const w = 300;
  const h = 370;

  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = '#11172a';
  ctx.fill();
  ctx.strokeStyle = '#4e9bff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.clip();

  if (avatar) {
    const scale = Math.max(w / avatar.width, h / avatar.height);
    const drawW = avatar.width * scale;
    const drawH = avatar.height * scale;
    const drawX = x + (w - drawW) / 2;
    const drawY = y + (h - drawH) / 2;

    ctx.drawImage(avatar, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = '#151b31';
    ctx.fillRect(x, y, w, h);

    drawText(ctx, 'AUCUNE IMAGE', x + 77, y + 150, 17, '#ffffff', 'bold');
    drawText(ctx, 'DÉFINIE', x + 111, y + 177, 17, '#ffffff', 'bold');
    drawText(ctx, 'Utilise Modifier l’image', x + 70, y + 220, 14, '#d8d2ff', 'regular');
  }

  ctx.restore();
}

function drawInfoBox(ctx, label, value, x, y, w, h, accent = '#4e9bff') {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = 'rgba(10, 15, 31, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 155, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, label, x + 16, y + 20, 12, '#cec6f6', 'bold');
  drawText(ctx, value, x + 16, y + 47, 18, '#ffffff', 'bold');

  ctx.globalAlpha = 0.9;
  roundRect(ctx, x + 16, y + h - 10, Math.max(30, w - 32), 3, 2);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawProgressBar(ctx, x, y, w, h, progress) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const fillWidth = Math.max(h, w * Math.max(0, Math.min(1, progress)));

  roundRect(ctx, x, y, fillWidth, h, h / 2);
  ctx.fillStyle = '#8b5cf6';
  ctx.fill();
}

async function createProfileCanvas(profile) {
  const width = 1400;
  const height = 820;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const logo = await loadLocalImage(LOGO_PATH);
  const avatarUrl = profile?.avatarUrl || null;
  const avatar = avatarUrl ? await loadRemoteImage(avatarUrl) : null;

  drawBackground(ctx, width, height);
  drawMainFrame(ctx, width, height);
  drawHeader(ctx, profile, logo);
  drawAvatar(ctx, avatar);

  const name = truncateText(profile.characterName || 'Personnage inconnu', 24);
  const age = truncateText(profile.age || 'Inconnu', 22);
  const guildName = truncateText(profile.guildName || 'Sans guilde', 28);
  const magicType = truncateText(profile.magicType || 'Magie inconnue', 28);
  const title = truncateText(profile.title || 'Mage errant', 28);
  const powerLevel = formatNumber(profile.powerLevel || 0);
  const jewels = formatNumber(profile.jewels || 0);
  const reputation = Number(profile.reputation || 0);
  const level = Number(profile.level || 1);
  const xp = Number(profile.xp || 0);
  const xpNeeded = getXpNeeded(level);
  const progress = xpNeeded > 0 ? Math.min(1, xp / xpNeeded) : 0;
  const description = profile.description || 'Aucune description renseignée.';

  drawInfoBox(ctx, 'NOM', name, 455, 255, 260, 62);
  drawInfoBox(ctx, 'GUILDE', guildName, 735, 255, 260, 62);

  drawInfoBox(ctx, 'MAGIE', magicType, 455, 333, 260, 62);
  drawInfoBox(ctx, 'ÂGE', age, 735, 333, 260, 62);

  drawInfoBox(ctx, 'TITRE', title, 455, 411, 540, 62);

  roundRect(ctx, 455, 505, 540, 82, 12);
  ctx.fillStyle = 'rgba(10, 15, 31, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 155, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'NIVEAU DE PUISSANCE', 475, 530, 13, '#cec6f6', 'bold');
  drawText(ctx, powerLevel, 475, 566, 30, '#ffffff', 'bold');
  drawProgressBar(ctx, 630, 548, 330, 14, Math.min(1, Number(profile.powerLevel || 0) / 5000));

  roundRect(ctx, 455, 605, 540, 70, 12);
  ctx.fillStyle = 'rgba(10, 15, 31, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(78, 155, 255, 0.55)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, `PROGRESSION DU NIVEAU ${level}`, 475, 629, 13, '#cec6f6', 'bold');
  drawTextRight(ctx, `${formatNumber(xp)} / ${formatNumber(xpNeeded)} XP`, 960, 629, 12, '#ffffff', 'bold');
  drawProgressBar(ctx, 475, 648, 485, 13, progress);

  roundRect(ctx, 118, 690, 720, 70, 14);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'DESCRIPTION', 140, 711, 13, '#cec6f6', 'bold');
  drawWrappedText(ctx, description, 140, 736, 660, 20, 2, 17, '#ffffff');

  drawInfoBox(ctx, 'JEWELS', jewels, 865, 690, 180, 70, '#ffd966');

  drawInfoBox(
    ctx,
    'RÉPUTATION',
    `${reputation} · ${getReputationLabel(reputation)}`,
    1065,
    690,
    215,
    70,
    reputation >= 0 ? '#8b5cf6' : '#ff6b6b',
  );

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-profil.png',
  });
}

module.exports = {
  createProfileCanvas,
};