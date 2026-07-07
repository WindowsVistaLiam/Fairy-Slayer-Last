const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');
const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus', 'Marcellus-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cinzel', 'static', 'Cinzel-Bold.ttf');
const EMOJI_FONT_PATHS = [
  'C:/Windows/Fonts/seguiemj.ttf',
  '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/opentype/noto/NotoColorEmoji.ttf',
];
const FONT_REGULAR = 'FairyGachaRegular';
const FONT_BOLD = 'FairyGachaBold';
const remoteImageCache = new Map();
const MAX_REMOTE_IMAGE_BYTES = 10 * 1024 * 1024;
let fontsLoaded = false;

function ensureFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;
  if (fs.existsSync(FONT_REGULAR_PATH)) GlobalFonts.registerFromPath(FONT_REGULAR_PATH, FONT_REGULAR);
  if (fs.existsSync(FONT_BOLD_PATH)) GlobalFonts.registerFromPath(FONT_BOLD_PATH, FONT_BOLD);
  const emojiPath = EMOJI_FONT_PATHS.find((fontPath) => fs.existsSync(fontPath));
  if (emojiPath) {
    try {
      GlobalFonts.registerFromPath(emojiPath, 'FairyGachaEmoji');
    } catch (_) {
      // Le rendu texte reste disponible si la police emoji système est incompatible.
    }
  }
}

function roundRect(ctx, x, y, width, height, radius = 20) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function setFont(ctx, size, style = 'regular') {
  const family = style === 'bold' ? FONT_BOLD : FONT_REGULAR;
  ctx.font = `${size}px "${family}", "FairyGachaEmoji", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif`;
}

function fitText(ctx, text, maxWidth, startSize, minSize = 14, style = 'regular') {
  let size = startSize;
  do {
    setFont(ctx, size, style);
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  } while (size > minSize);
  return minSize;
}

function drawText(ctx, text, x, y, maxWidth, size = 24, color = '#ffffff', align = 'left', style = 'regular') {
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  setFont(ctx, fitText(ctx, String(text), maxWidth, size, 11, style), style);
  ctx.fillText(String(text), x, y, maxWidth);
}

async function loadRemoteCardImage(imageUrl) {
  if (!/^https?:\/\//i.test(String(imageUrl || ''))) return null;
  if (remoteImageCache.has(imageUrl)) return remoteImageCache.get(imageUrl);
  if (remoteImageCache.size >= 200) remoteImageCache.clear();

  const pending = (async () => {
    try {
      const response = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const declaredSize = Number(response.headers.get('content-length') || 0);
      if (declaredSize > MAX_REMOTE_IMAGE_BYTES) return null;
      const data = Buffer.from(await response.arrayBuffer());
      if (!data.length || data.length > MAX_REMOTE_IMAGE_BYTES) return null;
      return await loadImage(data);
    } catch (_) {
      return null;
    }
  })().then((image) => {
    if (!image) remoteImageCache.delete(imageUrl);
    return image;
  });

  remoteImageCache.set(imageUrl, pending);
  return pending;
}

function drawImageCover(ctx, image, centerX, centerY, radius) {
  const diameter = radius * 2;
  const scale = Math.max(diameter / image.width, diameter / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function drawCard(ctx, result, x, y, width, height, detailed = false, cardImage = null) {
  const { card, isNew, fragmentsEarned, statusLabel } = result;
  const accent = card.color || '#9b8cff';
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, `${accent}55`);
  gradient.addColorStop(0.45, 'rgba(20, 17, 38, 0.98)');
  gradient.addColorStop(1, 'rgba(8, 12, 24, 0.98)');

  roundRect(ctx, x, y, width, height, detailed ? 30 : 20);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = detailed ? 5 : 3;
  ctx.stroke();

  const glow = ctx.createRadialGradient(x + width / 2, y + height * 0.34, 10, x + width / 2, y + height * 0.34, width * 0.42);
  glow.addColorStop(0, `${accent}aa`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x + 8, y + 8, width - 16, height * 0.58);

  const circleRadius = detailed ? 140 : 46;
  const portraitY = y + (detailed ? 205 : 83);
  ctx.beginPath();
  ctx.arc(x + width / 2, portraitY, circleRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(7, 10, 23, 0.82)';
  ctx.fill();
  ctx.strokeStyle = `${accent}dd`;
  ctx.lineWidth = detailed ? 5 : 3;
  ctx.stroke();

  if (cardImage) {
    drawImageCover(ctx, cardImage, x + width / 2, portraitY, circleRadius - 4);
  } else {
    const initials = card.characterName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    drawText(ctx, initials, x + width / 2, y + (detailed ? 153 : 55), width - 30, detailed ? 78 : 36, accent, 'center', 'bold');
  }
  drawText(ctx, card.characterName, x + width / 2, y + (detailed ? 370 : 142), width - 24, detailed ? 42 : 20, '#ffffff', 'center', 'bold');
  drawText(ctx, card.title, x + width / 2, y + (detailed ? 425 : 171), width - 30, detailed ? 29 : 15, '#ddd6ff', 'center');
  drawText(ctx, card.rarityLabel, x + width / 2, y + (detailed ? 475 : 204), width - 24, detailed ? 28 : 15, accent, 'center', 'bold');

  const status = statusLabel || (isNew ? '🌟 NOUVELLE CARTE' : `💎 DOUBLON  +${fragmentsEarned} fragments`);
  roundRect(ctx, x + 14, y + height - (detailed ? 70 : 42), width - 28, detailed ? 46 : 28, 12);
  ctx.fillStyle = isNew ? 'rgba(87, 242, 135, 0.20)' : 'rgba(255, 209, 102, 0.18)';
  ctx.fill();
  drawText(ctx, status, x + width / 2, y + height - (detailed ? 61 : 36), width - 40, detailed ? 21 : 12, isNew ? '#74f39a' : '#ffd166', 'center');
}

async function drawLogo(ctx, width) {
  if (!fs.existsSync(LOGO_PATH)) return;
  try {
    const logo = await loadImage(LOGO_PATH);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(logo, width - 145, 34, 88, 88);
    ctx.globalAlpha = 1;
  } catch (_) {
    // Le tirage reste fonctionnel si le logo local est absent ou illisible.
  }
}

async function createGachaResultCanvas(results, summary = {}) {
  ensureFonts();
  const single = results.length === 1;
  const width = 1400;
  const height = single ? 900 : 820;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#15091f');
  background.addColorStop(0.5, '#17152f');
  background.addColorStop(1, '#421526');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  for (let index = 0; index < 90; index += 1) {
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, 1 + Math.random() * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 225, 155, ${0.08 + Math.random() * 0.25})`;
    ctx.fill();
  }

  drawText(ctx, '✨ FAIRY SLAYER — INVOCATION', 55, 38, 1100, 42, '#ffd166', 'left', 'bold');
  drawText(ctx, summary.paymentLabel || 'Tirage', 58, 88, 900, 21, '#d8d2f4');
  await drawLogo(ctx, width);
  const cardImages = await Promise.all(results.map((result) => loadRemoteCardImage(result.card.imageUrl)));

  if (single) {
    drawCard(ctx, results[0], 350, 145, 700, 650, true, cardImages[0]);
  } else {
    const cardWidth = 240;
    const cardHeight = 280;
    const gapX = 24;
    const gapY = 28;
    const startX = (width - (cardWidth * 5 + gapX * 4)) / 2;
    const startY = 150;
    results.forEach((result, index) => {
      const column = index % 5;
      const row = Math.floor(index / 5);
      drawCard(ctx, result, startX + column * (cardWidth + gapX), startY + row * (cardHeight + gapY), cardWidth, cardHeight, false, cardImages[index]);
    });
  }

  drawText(
    ctx,
    summary.footerText || `🌟 ${summary.newCount || 0} nouvelle(s) carte(s) • 🃏 ${summary.duplicateCount || 0} doublon(s) • 💎 +${summary.fragmentsEarned || 0} fragments`,
    width / 2,
    height - 52,
    width - 120,
    22,
    '#f5f0ff',
    'center',
  );

  return new AttachmentBuilder(await canvas.encode('png'), { name: 'fairy-slayer-gacha.png' });
}

module.exports = { createGachaResultCanvas };
