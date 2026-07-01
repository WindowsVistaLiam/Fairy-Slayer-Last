const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

try {
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVu Sans');
  GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVu Sans Bold');
} catch (_) {
  // Les polices système suffisent si DejaVu n'existe pas sur la machine.
}

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
  ctx.font = `${bold ? 'bold ' : ''}${size}px "DejaVu Sans"`;
}

function drawText(ctx, text, x, y, size = 26, color = '#ffffff', bold = false) {
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  ctx.fillText(String(text), x, y);
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

  if (lines.length < maxLines && current) lines.push(current);

  if (lines.length > maxLines) return lines.slice(0, maxLines);

  if (words.length && lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].replace(/\s+$/u, '')}…`;
    }
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

function drawStat(ctx, stat, x, y, w, accent) {
  roundRect(ctx, x, y, w, 76, 18);
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fill();
  ctx.strokeStyle = `${accent}cc`;
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, stat.label, x + 18, y + 29, 17, '#b8c7ff');
  drawText(ctx, stat.value, x + 18, y + 60, 25, '#ffffff', true);
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

  const width = 1200;
  const height = 720;
  const accent = THEME[variant] || THEME.neutral;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#060914');
  background.addColorStop(0.52, '#111936');
  background.addColorStop(1, '#261036');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 210, 95, 260, accent, 0.22);
  drawGlow(ctx, 1030, 610, 340, '#d7c6ff', 0.16);

  for (let i = 0; i < 36; i += 1) {
    const x = 70 + ((i * 307) % 1060);
    const y = 64 + ((i * 173) % 580);
    ctx.globalAlpha = 0.12 + ((i % 7) * 0.035);
    ctx.beginPath();
    ctx.arc(x, y, 1.8 + (i % 4), 0, Math.PI * 2);
    ctx.fillStyle = '#efe9ff';
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  roundRect(ctx, 44, 44, width - 88, height - 88, 34);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.86)';
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.stroke();

  roundRect(ctx, 76, 72, 1048, 108, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.13)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawText(ctx, 'FAIRY SLAYER', 100, 114, 25, '#d9d2ff', true);
  drawText(ctx, stripDiscordMarkdown(section).toUpperCase(), 100, 151, 38, '#ffffff', true);
  drawText(ctx, stripDiscordMarkdown(title), 610, 127, 28, accent, true);
  if (subtitle) drawText(ctx, stripDiscordMarkdown(subtitle), 610, 160, 21, '#e8e7ff');

  const visibleStats = stats.slice(0, 4);
  if (visibleStats.length) {
    const gap = 18;
    const statW = Math.floor((1048 - (gap * (visibleStats.length - 1))) / visibleStats.length);
    visibleStats.forEach((stat, index) => drawStat(ctx, stat, 76 + index * (statW + gap), 202, statW, accent));
  }

  const contentY = visibleStats.length ? 306 : 210;
  const contentH = visibleStats.length ? 315 : 414;
  roundRect(ctx, 76, contentY, 1048, contentH, 24);
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  setFont(ctx, 24, false);
  const cleanLines = lines.length ? lines : ['Aucune donnée à afficher pour l’instant.'];
  let cursorY = contentY + 44;
  const maxY = contentY + contentH - 28;

  for (const rawLine of cleanLines) {
    if (cursorY > maxY) break;
    const wrapped = wrapText(ctx, rawLine, 970, 2);
    for (const line of wrapped) {
      if (cursorY > maxY) break;
      drawText(ctx, line, 108, cursorY, 23, '#f4f1ff');
      cursorY += 34;
    }
    cursorY += 10;
  }

  if (footer) {
    roundRect(ctx, 76, 638, 1048, 38, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();
    drawText(ctx, stripDiscordMarkdown(footer), 100, 664, 19, '#cfc8ff');
  }

  return new AttachmentBuilder(await canvas.encode('png'), { name: fileName });
}

module.exports = { createPanelCanvas };
