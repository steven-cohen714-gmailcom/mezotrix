function fmtR(n) {
  if (n == null) return 'R0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1000000) return sign + 'R' + (abs / 1000000).toFixed(2) + 'M';
  if (abs >= 1000) return sign + 'R' + (abs / 1000).toFixed(0) + 'K';
  return sign + 'R' + abs.toFixed(0);
}

function fmtRFull(n) {
  if (n == null) return 'R0.00';
  const sign = n < 0 ? '-' : '';
  return sign + 'R' + Math.abs(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n) {
  if (n == null) return '0%';
  return n.toFixed(1) + '%';
}

function yoyChange(current, prior) {
  if (!prior || prior === 0) return null;
  return ((current - prior) / Math.abs(prior)) * 100;
}

function yoyHtml(current, prior) {
  const pct = yoyChange(current, prior);
  if (pct === null) return '';
  const cls = pct >= 0 ? 'positive' : 'negative';
  const arrow = pct >= 0 ? '+' : '';
  return `<span class="yoy ${cls}">${arrow}${pct.toFixed(1)}% YoY</span>`;
}

function fmtNum(n) {
  if (n == null) return '0';
  return Math.round(n).toLocaleString('en-ZA');
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function monthLabel(mo) { return MONTHS[mo - 1] || ''; }
