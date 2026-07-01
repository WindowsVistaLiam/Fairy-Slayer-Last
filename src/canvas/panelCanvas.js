const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

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

const THEME = {
  profile: '#9b8cff',
  inventory: '#4da3ff',
  missions: '#ffb347',
  relations: '#64d2a6',
  rumors: '#c084fc',
  reputation: '#ffdf91',
  shop: '#f7d078',
  ranking: '#ffdf91',
  admin: '#ff6b6b',
  neutral: '#9b8cff',
};

const LABELS = {
  profile: 'FICHE DE MAGE',
  inventory: 'ARSENAL',
  missions: 'TABLEAU DES REQUÊTES',
  relations: 'LIENS RP',
  rumors: 'MURMURES DE GUILDE',
  reputation: 'RENOMMÉE',
  shop: 'BOUTIQUE MAGIQUE',
  ranking: 'PANNEAU DES LÉGENDES',
  admin: 'CONSEIL DU STAFF',
  neutral: 'FAIRY SLAYER',
};

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

function setFont(ctx, size, bold = false) {
  ctx.font = `${bold ? '700' : '400'} ${size}px ${FONT}`;
}

function drawText(ctx, text, x, y, size = 26, color = '#ffffff', bold = false, maxWidth = undefined) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  if (maxWidth) ctx.fillText(String(text || ''), x, y, maxWidth);
  else ctx.fillText(String(text || ''), x, y);
  ctx.restore();
}

function drawCenteredText(ctx, text, x, y, width, size = 26, color = '#ffffff', bold = false) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  ctx.textAlign = 'center';
  ctx.fillText(String(text || ''), x + width / 2, y, width);
  ctx.restore();
}

function stripDiscordMarkdown(text) {
  return String(text || '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/<@!?(\d+)>/g, 'Utilisateur $1')
    .replace(/<#(\d+)>/g, 'Salon $1');
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
  const words = stripDiscordMarkdown(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  let consumed = 0;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }

    consumed += 1;
    if (lines.length >= maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length === maxLines && consumed < words.length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+$/u, '')}…`;
  }

  return lines;
}

function drawGlow(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
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
  ctx.globalAlpha = 0.33;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const x1 = Math.cos(angle) * radius * 0.7;
    const y1 = Math.sin(angle) * radius * 0.7;
    const x2 = Math.cos(angle + 0.35) * radius;
    const y2 = Math.sin(angle + 0.35) * radius;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();

  ctx.restore();
}

function drawGuildCrest(ctx, x, y, scale, color = '#f7d078') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(0, -64);
  ctx.bezierCurveTo(38, -54, 58, -22, 35, 8);
  ctx.bezierCurveTo(74, 7, 90, 32, 61, 56);
  ctx.bezierCurveTo(27, 80, -5, 58, -9, 23);
  ctx.bezierCurveTo(-31, 55, -73, 55, -86, 24);
  ctx.bezierCurveTo(-99, -7, -66, -25, -31, -12);
  ctx.bezierCurveTo(-39, -46, -23, -72, 0, -64);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#15162a';
  ctx.beginPath();
  ctx.arc(-6, 9, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStat(ctx, stat, x, y, w, accent) {
  roundRect(ctx, x, y, w, 82, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.065)';
  ctx.fill();
  ctx.strokeStyle = `${accent}cc`;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, stat.label, x + 18, y + 31, 17, '#c9bdf7', true, w - 36);
  drawText(ctx, stat.value, x + 18, y + 64, 26, '#ffffff', true, w - 36);
}

function drawContentLine(ctx, rawLine, x, y, maxWidth, accent) {
  const line = stripDiscordMarkdown(rawLine);
  const isLocked = line.toLowerCase().includes('verrouillé');
  const isAvailable = line.toLowerCase().includes('disponible');

  roundRect(ctx, x, y - 26, maxWidth, 54, 17);
  ctx.fillStyle = isLocked ? 'rgba(255, 107, 107, 0.075)' : 'rgba(255,255,255,0.052)';
  ctx.fill();
  ctx.strokeStyle = isLocked ? 'rgba(255, 107, 107, 0.33)' : 'rgba(255,255,255,0.095)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const bulletColor = isLocked ? '#ff6b6b' : isAvailable ? '#64d2a6' : accent;
  ctx.fillStyle = bulletColor;
  ctx.beginPath();
  ctx.arc(x + 24, y, 7, 0, Math.PI * 2);
  ctx.fill();

  setFont(ctx, 22, false);
  const wrapped = wrapText(ctx, line, maxWidth - 62, 1);
  drawText(ctx, wrapped[0] || line, x + 44, y + 7, 22, '#f4f1ff', false, maxWidth - 62);
}

async function createPanelCanvas(options) {
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

  const width = 1300;
  const height = 760;
  const accent = THEME[variant] || THEME.neutral;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#100719');
  background.addColorStop(0.36, '#1b1641');
  background.addColorStop(0.72, '#10182f');
  background.addColorStop(1, '#35101e');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 190, 110, 290, accent, 0.27);
  drawGlow(ctx, 1080, 130, 260, '#f7d078', 0.18);
  drawGlow(ctx, 1120, 650, 330, '#ff6b3d', 0.16);

  drawMagicCircle(ctx, 1025, 205, 125, '#f7d078');
  drawMagicCircle(ctx, 205, 620, 105, accent);

  for (let i = 0; i < 64; i += 1) {
    const x = 70 + ((i * 331) % 1160);
    const y = 64 + ((i * 197) % 630);
    ctx.globalAlpha = 0.12 + ((i % 7) * 0.035);
    ctx.beginPath();
    ctx.arc(x, y, 1.7 + (i % 4) * 0.75, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? '#f7d078' : '#efe9ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.64)';
  ctx.shadowBlur = 32;
  roundRect(ctx, 48, 48, width - 96, height - 96, 36);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(247, 208, 120, 0.46)';
  ctx.lineWidth = 2;
  roundRect(ctx, 68, 68, width - 136, height - 136, 28);
  ctx.stroke();
  ctx.restore();

  const headerGradient = ctx.createLinearGradient(84, 82, width - 84, 182);
  headerGradient.addColorStop(0, 'rgba(124, 92, 255, 0.55)');
  headerGradient.addColorStop(0.58, 'rgba(247, 208, 120, 0.20)');
  headerGradient.addColorStop(1, 'rgba(255, 107, 61, 0.42)');

  roundRect(ctx, 84, 82, width - 168, 116, 28);
  ctx.fillStyle = headerGradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 112, 126, 25, '#f7d078', true);
  drawText(ctx, stripDiscordMarkdown(section).toUpperCase(), 112, 174, 41, '#ffffff', true, 660);

  drawText(ctx, LABELS[variant] || LABELS.neutral, 735, 126, 24, accent, true, 350);
  drawText(ctx, stripDiscordMarkdown(title), 735, 165, 29, '#ffffff', true, 360);
  if (subtitle) drawText(ctx, stripDiscordMarkdown(subtitle), 735, 190, 18, '#e8e7ff', false, 360);

  drawGuildCrest(ctx, 1152, 140, 0.42, '#f7d078');

  const visibleStats = stats.slice(0, 4);
  if (visibleStats.length) {
    const gap = 18;
    const statW = Math.floor((width - 168 - (gap * (visibleStats.length - 1))) / visibleStats.length);
    visibleStats.forEach((stat, index) => drawStat(ctx, stat, 84 + index * (statW + gap), 224, statW, accent));
  }

  const contentY = visibleStats.length ? 334 : 228;
  const contentH = visibleStats.length ? 296 : 402;
  roundRect(ctx, 84, contentY, width - 168, contentH, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const cleanLines = lines.length ? lines : ['Aucune donnée à afficher pour l’instant.'];
  let cursorY = contentY + 48;
  const maxY = contentY + contentH - 32;
  const lineBoxH = 64;

  for (const rawLine of cleanLines) {
    if (cursorY > maxY) break;
    drawContentLine(ctx, rawLine, 112, cursorY, width - 224, accent);
    cursorY += lineBoxH;
  }

  if (cleanLines.length > Math.floor((contentH - 48) / lineBoxH)) {
    drawCenteredText(ctx, '…', 84, contentY + contentH - 24, width - 168, 28, accent, true);
  }

  if (footer) {
    roundRect(ctx, 84, 666, width - 168, 44, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.stroke();
    drawText(ctx, stripDiscordMarkdown(footer), 112, 696, 19, '#cfc8ff', false, width - 224);
  }

  ctx.save();
  ctx.strokeStyle = '#f7d078';
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.82;

  ctx.beginPath();
  ctx.moveTo(78, 144);
  ctx.lineTo(78, 78);
  ctx.lineTo(150, 78);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 78, 144);
  ctx.lineTo(width - 78, 78);
  ctx.lineTo(width - 150, 78);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(78, height - 144);
  ctx.lineTo(78, height - 78);
  ctx.lineTo(150, height - 78);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - 78, height - 144);
  ctx.lineTo(width - 78, height - 78);
  ctx.lineTo(width - 150, height - 78);
  ctx.stroke();

  ctx.restore();

  return new AttachmentBuilder(await canvas.encode('png'), { name: fileName });
}

module.exports = { createPanelCanvas };
