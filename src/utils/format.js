function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(value || 0);
}

function truncateText(value, max = 120) {
  const text = String(value || '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

module.exports = { formatNumber, truncateText };
