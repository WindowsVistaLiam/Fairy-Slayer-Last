function drawStar(ctx, cx, cy, radius, color, points = 5) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * index) / points;
    const length = index % 2 === 0 ? radius : radius * 0.45;
    const x = cx + Math.cos(angle) * length;
    const y = cy + Math.sin(angle) * length;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCanvasIcon(ctx, key, x, y, size = 22, color = '#ffdf91') {
  const cx = x + size / 2;
  const cy = y + size / 2;
  const scale = size / 24;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(1.5, 2 * scale);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (['sparkle', 'magic', 'star'].includes(key)) {
    drawStar(ctx, cx, cy, size * 0.45, color, key === 'sparkle' ? 4 : 5);
  } else if (key === 'coin') {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a5411';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.24, 0, Math.PI * 2);
    ctx.stroke();
  } else if (key === 'user') {
    ctx.beginPath();
    ctx.arc(cx, y + size * 0.32, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, y + size * 0.95, size * 0.36, Math.PI, 0);
    ctx.fill();
  } else if (key === 'guild') {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.08, y + size * 0.46);
    ctx.lineTo(cx, y + size * 0.1);
    ctx.lineTo(x + size * 0.92, y + size * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x + size * 0.2, y + size * 0.44, size * 0.6, size * 0.45);
    ctx.fillStyle = '#10152a';
    ctx.fillRect(x + size * 0.43, y + size * 0.62, size * 0.14, size * 0.27);
  } else if (key === 'crown') {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.12, y + size * 0.72);
    ctx.lineTo(x + size * 0.05, y + size * 0.27);
    ctx.lineTo(x + size * 0.33, y + size * 0.5);
    ctx.lineTo(cx, y + size * 0.14);
    ctx.lineTo(x + size * 0.67, y + size * 0.5);
    ctx.lineTo(x + size * 0.95, y + size * 0.27);
    ctx.lineTo(x + size * 0.88, y + size * 0.72);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'sword') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-size * 0.06, -size * 0.43, size * 0.12, size * 0.65);
    ctx.fillRect(-size * 0.28, size * 0.12, size * 0.56, size * 0.1);
    ctx.fillRect(-size * 0.08, size * 0.2, size * 0.16, size * 0.22);
    ctx.restore();
  } else if (key === 'shield' || key === 'armor') {
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.06);
    ctx.lineTo(x + size * 0.86, y + size * 0.22);
    ctx.lineTo(x + size * 0.78, y + size * 0.7);
    ctx.quadraticCurveTo(cx, y + size * 0.96, x + size * 0.22, y + size * 0.7);
    ctx.lineTo(x + size * 0.14, y + size * 0.22);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'book') {
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.25);
    ctx.quadraticCurveTo(x + size * 0.24, y + size * 0.05, x + size * 0.08, y + size * 0.24);
    ctx.lineTo(x + size * 0.08, y + size * 0.82);
    ctx.quadraticCurveTo(x + size * 0.28, y + size * 0.65, cx, y + size * 0.84);
    ctx.quadraticCurveTo(x + size * 0.72, y + size * 0.65, x + size * 0.92, y + size * 0.82);
    ctx.lineTo(x + size * 0.92, y + size * 0.24);
    ctx.quadraticCurveTo(x + size * 0.76, y + size * 0.05, cx, y + size * 0.25);
    ctx.fill();
    ctx.strokeStyle = '#10152a';
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.25);
    ctx.lineTo(cx, y + size * 0.84);
    ctx.stroke();
  } else if (key === 'chart') {
    ctx.fillRect(x + size * 0.1, y + size * 0.58, size * 0.18, size * 0.3);
    ctx.fillRect(x + size * 0.4, y + size * 0.4, size * 0.18, size * 0.48);
    ctx.fillRect(x + size * 0.7, y + size * 0.14, size * 0.18, size * 0.74);
  } else if (key === 'gem') {
    ctx.beginPath();
    ctx.moveTo(cx, y + size * 0.95);
    ctx.lineTo(x + size * 0.08, y + size * 0.4);
    ctx.lineTo(x + size * 0.28, y + size * 0.12);
    ctx.lineTo(x + size * 0.72, y + size * 0.12);
    ctx.lineTo(x + size * 0.92, y + size * 0.4);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'hammer') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 4);
    ctx.fillRect(-size * 0.07, -size * 0.05, size * 0.14, size * 0.48);
    ctx.fillRect(-size * 0.28, -size * 0.3, size * 0.56, size * 0.24);
    ctx.restore();
  } else if (key === 'flask') {
    ctx.fillRect(x + size * 0.42, y + size * 0.08, size * 0.16, size * 0.34);
    ctx.beginPath();
    ctx.moveTo(x + size * 0.42, y + size * 0.36);
    ctx.lineTo(x + size * 0.16, y + size * 0.82);
    ctx.quadraticCurveTo(cx, y + size, x + size * 0.84, y + size * 0.82);
    ctx.lineTo(x + size * 0.58, y + size * 0.36);
    ctx.closePath();
    ctx.fill();
  } else if (key === 'music') {
    ctx.fillRect(x + size * 0.56, y + size * 0.1, size * 0.1, size * 0.58);
    ctx.fillRect(x + size * 0.62, y + size * 0.1, size * 0.3, size * 0.1);
    ctx.beginPath();
    ctx.arc(x + size * 0.42, y + size * 0.72, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    drawStar(ctx, cx, cy, size * 0.42, color, 4);
  }

  ctx.restore();
}

module.exports = { drawCanvasIcon };
