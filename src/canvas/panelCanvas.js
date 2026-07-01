const path = require('node:path');
const fs = require('node:fs');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const FONT_TITLE_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'crown_title', 'CROWNT.TTF');
const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus', 'Marcellus-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cinzel', 'static', 'Cinzel-Bold.ttf');

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');

const FONT_TITLE = 'FairyPanelTitle';
const FONT_REGULAR = 'FairyPanelRegular';
const FONT_BOLD = 'FairyPanelBold';

let fontsLoaded = false;

const THEME = {
  profile: '#9b8cff',
  inventory: '#4da3ff',
  missions: '#ffb347',
  relations: '#64d2a6',
  rumors: '#c084fc',
  reputation: '#ffdf91',
  shop: '#9b8cff',
  ranking: '#ffdf91',
  admin: '#ff6b6b',
  neutral: '#9b8cff',
};

function ensureFonts() {
  if (fontsLoaded) return;
  fontsLoaded = true;

  try {
    if (fs.existsSync(FONT_TITLE_PATH)) {
      GlobalFonts.registerFromPath(FONT_TITLE_PATH, FONT_TITLE);
      console.log('✅ Panel police Title chargée : CROWNT.TTF');
    } else {
      console.warn('⚠️ Panel police titre manquante : src/assets/fonts/crown_title/CROWNT.TTF');
    }

    if (fs.existsSync(FONT_REGULAR_PATH)) {
      GlobalFonts.registerFromPath(FONT_REGULAR_PATH, FONT_REGULAR);
      console.log('✅ Panel police Regular chargée : Marcellus-Regular.ttf');
    } else {
      console.warn('⚠️ Panel police regular manquante : src/assets/fonts/Marcellus/Marcellus-Regular.ttf');
    }

    if (fs.existsSync(FONT_BOLD_PATH)) {
      GlobalFonts.registerFromPath(FONT_BOLD_PATH, FONT_BOLD);
      console.log('✅ Panel police Bold chargée : Cinzel-Bold.ttf');
    } else {
      console.warn('⚠️ Panel police bold manquante : src/assets/fonts/Cinzel/static/Cinzel-Bold.ttf');
    }
  } catch (error) {
    console.error('❌ Erreur chargement polices panel Canvas :', error);
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

  ctx.font = `${size}px "${family}"`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
}

function drawText(ctx, text, x, y, size = 24, color = '#ffffff', style = 'regular', maxWidth = undefined) {
  ctx.save();

  ctx.fillStyle = color;
  setFont(ctx, size, style);

  const value = stripDiscordMarkdown(text);

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

  ctx.fillText(stripDiscordMarkdown(text), x + width / 2, y);

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

function stripDiscordMarkdown(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/<@!?(\d+)>/g, 'Utilisateur')
    .replace(/<#(\d+)>/g, 'Salon')
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/·/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = stripDiscordMarkdown(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }

    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;

    if (consumed < words.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+$/u, '')}…`;
    }
  }

  return lines;
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

function drawGlow(ctx, x, y, radius, color, alpha = 0.22) {
  ctx.save();

  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawMagicCircle(ctx, x, y, radius, color) {
  ctx.save();

  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.13;
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

function drawCornerLines(ctx, x, y, w, h, color) {
  ctx.save();

  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 3;

  const size = 78;

  ctx.beginPath();
  ctx.moveTo(x, y + size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + size, y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - size, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + size);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + h - size);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + size, y + h);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w - size, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - size);
  ctx.stroke();

  ctx.restore();
}

function drawStat(ctx, stat, x, y, w, accent) {
  const h = 86;

  roundRect(ctx, x, y, w, h, 18);
  ctx.fillStyle = 'rgba(13, 18, 34, 0.88)';
  ctx.fill();

  ctx.strokeStyle = `${accent}dd`;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, stat.label, x + 18, y + 15, 16, '#cec6f6', 'bold', w - 36);
  drawText(ctx, stat.value, x + 18, y + 43, 28, '#ffffff', 'bold', w - 36);
}

function drawLineItem(ctx, line, x, y, w, accent) {
  roundRect(ctx, x, y, w, 60, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x + 24, y + 30, 7, 0, Math.PI * 2);
  ctx.fill();

  setFont(ctx, 22, 'regular');

  const wrapped = wrapText(ctx, line, w - 72, 1);

  drawText(ctx, wrapped[0] || '', x + 48, y + 17, 22, '#f4f1ff', 'regular', w - 72);
}

async function drawLogo(ctx, width, height) {
  const logo = await loadLocalImage(LOGO_PATH);

  if (!logo) {
    console.warn('⚠️ Logo panel manquant : src/assets/fairy-slayer-logo.png');
    return;
  }

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.drawImage(logo, width - 210, 94, 110, 110);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.drawImage(logo, width - 470, 265, 310, 310);
  ctx.restore();
}

async function createPanelCanvas(options) {
  ensureFonts();

  const {
    fileName = 'fairy-slayer-panel.png',
    section = 'Fairy Slayer',
    title = 'Menu',
    subtitle = '',
    stats = [],
    lines = [],
    footer = '',
    variant = 'neutral',
  } = options;

  const width = 1400;
  const height = 820;
  const accent = THEME[variant] || THEME.neutral;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Fond général
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#13081d');
  background.addColorStop(0.35, '#1f1438');
  background.addColorStop(0.68, '#111b2e');
  background.addColorStop(1, '#41151f');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 170, 105, 260, accent, 0.22);
  drawGlow(ctx, 1190, 725, 340, '#ff7a4e', 0.13);
  drawGlow(ctx, 1050, 130, 300, '#ffdf91', 0.10);

  // Particules
  for (let i = 0; i < 80; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const r = 0.8 + Math.random() * 2.4;

    ctx.save();
    ctx.globalAlpha = 0.12 + Math.random() * 0.35;
    ctx.fillStyle = i % 3 === 0 ? '#ffdf91' : '#efe9ff';

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawMagicCircle(ctx, 1180, 230, 120, '#ffdf91');
  drawMagicCircle(ctx, 200, 705, 110, accent);

  // Cadre principal
  roundRect(ctx, 50, 50, width - 100, height - 100, 36);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.86)';
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  roundRect(ctx, 72, 72, width - 144, height - 144, 28);
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawCornerLines(ctx, 80, 80, width - 160, height - 160, '#ffdf91');

  // Header
  const headerGradient = ctx.createLinearGradient(90, 88, width - 90, 200);
  headerGradient.addColorStop(0, 'rgba(127, 92, 255, 0.48)');
  headerGradient.addColorStop(0.58, 'rgba(255, 207, 99, 0.14)');
  headerGradient.addColorStop(1, 'rgba(255, 122, 78, 0.36)');

  roundRect(ctx, 90, 88, width - 180, 120, 26);
  ctx.fillStyle = headerGradient;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 120, 98, 34, '#ffcf63', 'title');
  drawText(ctx, stripDiscordMarkdown(section).toUpperCase(), 120, 140, 36, '#ffffff', 'bold', 560);

  drawText(ctx, stripDiscordMarkdown(title), 735, 110, 28, accent, 'bold', 400);

  if (subtitle) {
    drawText(ctx, stripDiscordMarkdown(subtitle), 735, 148, 19, '#e8e7ff', 'regular', 390);
  }

  await drawLogo(ctx, width, height);

  // Stats
  const visibleStats = Array.isArray(stats) ? stats.slice(0, 4) : [];
  const hasStats = visibleStats.length > 0;

  if (hasStats) {
    const statY = 238;
    const gap = 20;
    const totalW = width - 180;
    const statW = Math.floor((totalW - gap * (visibleStats.length - 1)) / visibleStats.length);

    visibleStats.forEach((stat, index) => {
      drawStat(ctx, stat, 90 + index * (statW + gap), statY, statW, accent);
    });
  }

  // Contenu
  const contentX = 90;
  const contentY = hasStats ? 360 : 250;
  const contentW = width - 180;
  const contentH = hasStats ? 300 : 410;

  roundRect(ctx, contentX, contentY, contentW, contentH, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const cleanLines = Array.isArray(lines) && lines.length
    ? lines
    : ['Aucune donnée à afficher pour l’instant.'];

  let cursorY = contentY + 30;
  const maxY = contentY + contentH - 70;
  const lineGap = 14;

  for (const rawLine of cleanLines) {
    if (cursorY > maxY) break;

    const wrapped = wrapText(ctx, rawLine, contentW - 100, 1);
    const line = wrapped[0] || '';

    drawLineItem(ctx, line, contentX + 30, cursorY, contentW - 60, accent);

    cursorY += 60 + lineGap;
  }

  // Footer, bien remonté dans le cadre
  if (footer) {
    const footerY = 685;

    roundRect(ctx, 90, footerY, width - 180, 48, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.055)';
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.stroke();

    drawText(ctx, stripDiscordMarkdown(footer), 120, footerY + 13, 19, '#cfc8ff', 'regular', width - 240);
  }

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: fileName,
  });
}

module.exports = { createPanelCanvas };