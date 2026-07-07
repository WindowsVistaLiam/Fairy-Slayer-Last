const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const { formatNumber } = require('../utils/format');

function registerFonts() {
  const fonts = [
    ['C:/Windows/Fonts/segoeui.ttf', 'Segoe UI'],
    ['C:/Windows/Fonts/segoeuib.ttf', 'Segoe UI Bold'],
    ['C:/Windows/Fonts/arial.ttf', 'Arial'],
    ['C:/Windows/Fonts/arialbd.ttf', 'Arial Bold'],
    ['C:/Windows/Fonts/seguiemj.ttf', 'Segoe UI Emoji'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'Segoe UI'],
    ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'Segoe UI Bold'],
  ];

  for (const [path, name] of fonts) {
    try {
      GlobalFonts.registerFromPath(path, name);
    } catch (_) {
      // Ignore si la police n'existe pas.
    }
  }
}

registerFonts();

const FONT = '"Segoe UI", "Segoe UI Emoji", "Noto Color Emoji", Arial, sans-serif';

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

function drawText(ctx, text, x, y, size, color, bold = false, maxWidth = undefined) {
  ctx.save();
  ctx.fillStyle = color;
  setFont(ctx, size, bold);
  if (maxWidth) ctx.fillText(String(text || ''), x, y, maxWidth);
  else ctx.fillText(String(text || ''), x, y);
  ctx.restore();
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

function drawMagicCircle(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#f7d078';
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 10; i += 1) {
    const angle = (Math.PI * 2 * i) / 10;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.72, Math.sin(angle) * radius * 0.72);
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.stroke();
  }

  ctx.restore();
}

async function createLevelUpCanvas(profile, gainedXp) {
  const width = 1100;
  const height = 380;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#120719');
  gradient.addColorStop(0.48, '#1a1742');
  gradient.addColorStop(1, '#3a111b');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, 175, 105, 230, '#7c5cff', 0.42);
  drawGlow(ctx, 930, 285, 270, '#f7d078', 0.24);
  drawMagicCircle(ctx, 900, 182, 112);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.62)';
  ctx.shadowBlur = 28;
  roundRect(ctx, 38, 38, width - 76, height - 76, 30);
  ctx.fillStyle = 'rgba(8, 12, 24, 0.88)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#f7d078';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(124,92,255,0.65)';
  ctx.lineWidth = 2;
  roundRect(ctx, 56, 56, width - 112, height - 112, 24);
  ctx.stroke();
  ctx.restore();

  drawText(ctx, 'FAIRY SLAYER', 78, 96, 25, '#f7d078', true);
  drawText(ctx, '✨ NIVEAU SUPÉRIEUR', 78, 158, 54, '#ffffff', true, 620);
  drawText(ctx, profile.characterName || 'Personnage inconnu', 82, 213, 32, '#d9d2ff', true, 620);

  roundRect(ctx, 82, 246, 420, 74, 22);
  ctx.fillStyle = 'rgba(255,255,255,0.075)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(247,208,120,0.42)';
  ctx.stroke();

  drawText(ctx, `🏆 Niveau RP ${profile.level}`, 108, 294, 38, '#f7d078', true);
  drawText(ctx, `📈 XP gagné : ${formatNumber(gainedXp)}`, 545, 294, 27, '#ffffff', true, 350);

  drawText(ctx, '🏰 La guilde reconnaît ta progression.', 700, 335, 22, '#d9d2ff', false, 330);

  return new AttachmentBuilder(await canvas.encode('png'), {
    name: 'fairy-slayer-level-up.png',
  });
}

module.exports = { createLevelUpCanvas };
