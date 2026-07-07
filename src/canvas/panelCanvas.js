const path = require('node:path');
const fs = require('node:fs');
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

const FONT_TITLE_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'crown_title', 'CROWNT.TTF');
const FONT_REGULAR_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Marcellus', 'Marcellus-Regular.ttf');
const FONT_BOLD_PATH = path.join(__dirname, '..', 'assets', 'fonts', 'Cinzel', 'static', 'Cinzel-Bold.ttf');
const EMOJI_FONT_PATHS = [
  'C:/Windows/Fonts/seguiemj.ttf',
  '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
  '/usr/share/fonts/opentype/noto/NotoColorEmoji.ttf',
];

const LOGO_PATH = path.join(__dirname, '..', 'assets', 'fairy-slayer-logo.png');

const FONT_TITLE = 'FairyPanelTitle';
const FONT_REGULAR = 'FairyPanelRegular';
const FONT_BOLD = 'FairyPanelBold';

let fontsLoaded = false;
let emojiFontLoaded = false;

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
  gacha: '#e66cff',
  guild: '#46c7a6',
  craft: '#ff9f43',
  profession: '#f2c94c',
  combat: '#ff5c5c',
  daily: '#59c3ff',
  neutral: '#9b8cff',
};

const VARIANT_ICONS = {
  profile: ['👤', '✨', '📖', '⭐'],
  inventory: ['🎒', '⚔️', '🛡️', '💎', '🧪'],
  missions: ['📜', '⚔️', '⭐', '🎁'],
  relations: ['🤝', '💞', '⚔️', '👥'],
  rumors: ['🗣️', '👁️', '✨', '📣'],
  reputation: ['⭐', '🏆', '✨', '📜'],
  shop: ['🏪', '💰', '🧪', '⚔️', '💎'],
  ranking: ['🏆', '🥇', '🥈', '🥉'],
  admin: ['⚙️', '🛡️', '📋', '🔧'],
  gacha: ['✨', '🔮', '🌟', '💎'],
  guild: ['🏰', '👥', '🏷️', '📨', '⭐'],
  craft: ['🛠️', '🔨', '⚗️', '📖', '✨'],
  profession: ['🛠️', '🌾', '💰', '🎶', '💎'],
  combat: ['⚔️', '🔥', '🛡️', '🏆'],
  daily: ['🌅', '🗺️', '🎁', '✨'],
  neutral: ['✨', '🔮', '⭐', '📜'],
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

    const emojiPath = EMOJI_FONT_PATHS.find((fontPath) => fs.existsSync(fontPath));
    if (emojiPath) {
      emojiFontLoaded = Boolean(GlobalFonts.registerFromPath(emojiPath, 'FairyEmoji'));
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

  ctx.font = `${size}px "${family}", "FairyEmoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
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

function drawEmoji(ctx, emoji, x, y, size = 24) {
  ensureFonts();
  ctx.save();

  if (!emojiFontLoaded) {
    const radius = size * 0.34;
    ctx.translate(x, y + size * 0.48);
    ctx.fillStyle = '#ffdf91';
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.32, -radius * 0.32);
    ctx.lineTo(radius, 0);
    ctx.lineTo(radius * 0.32, radius * 0.32);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.32, radius * 0.32);
    ctx.lineTo(-radius, 0);
    ctx.lineTo(-radius * 0.32, -radius * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.font = `${size}px "FairyEmoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(emoji || '✨'), x, y);
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

function drawAngularPanel(ctx, x, y, w, h, accent, options = {}) {
  const { cut = 14, fill = null, shadow = false, rivets = true } = options;

  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.58)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 7;
  }

  cutCornerPath(ctx, x, y, w, h, cut);
  ctx.fillStyle = fill || 'rgba(8, 12, 24, 0.92)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = `${accent}c9`;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  cutCornerPath(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(4, cut - 4));
  ctx.strokeStyle = 'rgba(255,223,145,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = `${accent}75`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + cut + 10, y + 5);
  ctx.lineTo(x + Math.min(w * 0.3, 120), y + 5);
  ctx.moveTo(x + w - cut - 10, y + h - 5);
  ctx.lineTo(x + w - Math.min(w * 0.3, 120), y + h - 5);
  ctx.stroke();

  if (rivets && w >= 150 && h >= 55) {
    ctx.fillStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 7;
    for (const [rivetX, rivetY] of [[x + cut + 7, y + 8], [x + w - cut - 7, y + h - 8]]) {
      ctx.beginPath();
      ctx.arc(rivetX, rivetY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function stripDiscordMarkdown(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/<@!?(\d+)>/g, 'Utilisateur')
    .replace(/<#(\d+)>/g, 'Salon')
    .replace(/\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu, '')
    .replace(/·/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLeadingEmoji(text) {
  const value = String(text || '').trimStart();
  const match = value.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*/u);
  if (!match) return { emoji: null, text: value };
  return { emoji: match[1], text: value.slice(match[0].length) };
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

function getStatEmoji(stat) {
  if (stat?.emoji) return stat.emoji;
  const label = String(stat?.label || '').toLowerCase();
  if (/joyaux|richesse|prix|valeur|solde/.test(label)) return '💰';
  if (/puissance|bonus|force/.test(label)) return '⚔️';
  if (/niveau|xp|progression/.test(label)) return '📈';
  if (/rang|classement/.test(label)) return '🏆';
  if (/métier|artisan/.test(label)) return '🛠️';
  if (/membre|profil|personnage/.test(label)) return '👤';
  if (/guilde/.test(label)) return '🏰';
  if (/réputation|statut/.test(label)) return '⭐';
  if (/mission|quête/.test(label)) return '📜';
  if (/objet|inventaire|total/.test(label)) return '🎒';
  if (/carte|collection/.test(label)) return '🃏';
  if (/victoire/.test(label)) return '🏆';
  if (/défaite/.test(label)) return '💥';
  if (/fragment|lacrima/.test(label)) return '💎';
  return '✨';
}

function drawStat(ctx, stat, x, y, w, accent) {
  const h = 86;

  drawAngularPanel(ctx, x, y, w, h, accent, { cut: 13, fill: 'rgba(13, 18, 34, 0.92)' });

  drawEmoji(ctx, getStatEmoji(stat), x + 29, y + 11, 22);
  drawText(ctx, stat.label, x + 48, y + 15, 16, '#cec6f6', 'bold', w - 64);
  drawText(ctx, stat.value, x + 18, y + 43, 28, '#ffffff', 'bold', w - 36);
}

function drawLineItem(ctx, line, x, y, w, accent, textColor = '#f4f1ff', emoji = '✨') {
  drawAngularPanel(ctx, x, y, w, 60, accent, {
    cut: 11, fill: 'rgba(255,255,255,0.045)', shadow: false, rivets: false,
  });

  ctx.fillStyle = `${accent}33`;
  ctx.beginPath();
  ctx.arc(x + 27, y + 30, 19, 0, Math.PI * 2);
  ctx.fill();
  drawEmoji(ctx, emoji, x + 27, y + 17, 20);

  setFont(ctx, 22, 'regular');

  const wrapped = wrapText(ctx, line, w - 82, 1);

  drawText(ctx, wrapped[0] || '', x + 58, y + 17, 22, textColor, 'regular', w - 82);
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

  const cleanLines = Array.isArray(lines) && lines.length
    ? lines
    : ['Aucune donnée à afficher pour l’instant.'];
  const maxVisibleLines = 12;
  const visibleLines = cleanLines.length > maxVisibleLines
    ? [...cleanLines.slice(0, maxVisibleLines - 1), `… ${cleanLines.length - maxVisibleLines + 1} élément(s) supplémentaire(s)`]
    : cleanLines;
  const hasStats = Array.isArray(stats) && stats.length > 0;
  const contentY = hasStats ? 360 : 250;
  const contentH = Math.max(hasStats ? 300 : 410, visibleLines.length * 74 + 46);
  const footerY = contentY + contentH + 25;
  const width = 1400;
  const height = Math.max(820, footerY + 135);
  const accent = THEME[variant] || THEME.neutral;
  const variantIcons = VARIANT_ICONS[variant] || VARIANT_ICONS.neutral;
  const decoratedTitle = extractLeadingEmoji(title);

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
  drawAngularPanel(ctx, 4, 4, width - 8, height - 8, accent, {
    cut: 30, fill: 'rgba(8, 12, 24, 0.88)', shadow: true,
  });

  cutCornerPath(ctx, 20, 20, width - 40, height - 40, 23);
  ctx.strokeStyle = 'rgba(255, 207, 99, 0.45)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawCornerLines(ctx, 28, 28, width - 56, height - 56, '#ffdf91');

  // Header
  const headerGradient = ctx.createLinearGradient(90, 88, width - 90, 200);
  headerGradient.addColorStop(0, 'rgba(127, 92, 255, 0.48)');
  headerGradient.addColorStop(0.58, 'rgba(255, 207, 99, 0.14)');
  headerGradient.addColorStop(1, 'rgba(255, 122, 78, 0.36)');

  drawAngularPanel(ctx, 90, 88, width - 180, 120, '#ffdf91', {
    cut: 20, fill: headerGradient, shadow: true,
  });

  drawText(ctx, 'FAIRY SLAYER', 120, 98, 34, '#ffcf63', 'title');
  drawText(ctx, stripDiscordMarkdown(section).toUpperCase(), 120, 140, 36, '#ffffff', 'bold', 560);

  ctx.beginPath();
  ctx.arc(696, 139, 34, 0, Math.PI * 2);
  ctx.fillStyle = `${accent}35`;
  ctx.fill();
  ctx.strokeStyle = `${accent}cc`;
  ctx.lineWidth = 2;
  ctx.stroke();
  drawEmoji(ctx, decoratedTitle.emoji || variantIcons[0], 696, 120, 30);

  drawText(ctx, stripDiscordMarkdown(decoratedTitle.text), 735, 110, 28, accent, 'bold', 400);

  if (subtitle) {
    drawText(ctx, stripDiscordMarkdown(subtitle), 735, 148, 19, '#e8e7ff', 'regular', 390);
  }

  await drawLogo(ctx, width, height);

  // Stats
  const visibleStats = Array.isArray(stats) ? stats.slice(0, 4) : [];

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
  const contentW = width - 180;

  drawAngularPanel(ctx, contentX, contentY, contentW, contentH, accent, {
    cut: 20, fill: 'rgba(255,255,255,0.035)', shadow: false,
  });

  let cursorY = contentY + 30;
  const lineGap = 14;

  for (const [lineIndex, rawLine] of visibleLines.entries()) {
    const lineText = typeof rawLine === 'object' && rawLine !== null ? rawLine.text : rawLine;
    const lineColor = typeof rawLine === 'object' && rawLine !== null ? rawLine.color : accent;
    const leading = extractLeadingEmoji(lineText);
    const lineEmoji = typeof rawLine === 'object' && rawLine !== null && rawLine.emoji
      ? rawLine.emoji
      : (leading.emoji || variantIcons[lineIndex % variantIcons.length]);
    const wrapped = wrapText(ctx, leading.text, contentW - 100, 1);
    const line = wrapped[0] || '';

    drawLineItem(ctx, line, contentX + 30, cursorY, contentW - 60, lineColor || accent, lineColor || '#f4f1ff', lineEmoji);

    cursorY += 60 + lineGap;
  }

  // Footer, bien remonté dans le cadre
  if (footer) {
    drawAngularPanel(ctx, 90, footerY, width - 180, 48, accent, {
      cut: 10, fill: 'rgba(255,255,255,0.045)', shadow: false, rivets: false,
    });

    drawEmoji(ctx, variantIcons[0], 118, footerY + 10, 20);
    drawText(ctx, stripDiscordMarkdown(footer), 145, footerY + 13, 19, '#cfc8ff', 'regular', width - 265);
  }

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: fileName,
  });
}

module.exports = { createPanelCanvas };
