/** Shared email text rules for the weekly and daily briefs. */

const LEGAL_SUFFIX =
  /\b(?:incorporated|inc|corp|corporation|ltd|limited|plc|n\.v|s\.a|company|co|class\s+[a-z]|ordinary\s+shares|common\s+stock|american\s+depositary\s+shares|depositary\s+shares)\b\.?/gi;

export function clipPreheader(text: string, limit = 90): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= limit) return cleaned;
  const cut = cleaned
    .slice(0, limit)
    .replace(/\s+\S*$/, '')
    .replace(/[.,;:]+$/, '')
    .trim();
  return cut || cleaned.slice(0, limit).trim();
}

export function displayCompanyName(name: string): string {
  let text = name || '';
  let previous = '';
  while (previous !== text) {
    previous = text;
    text = text.replace(LEGAL_SUFFIX, ' ');
    text = text.replace(/[,.\s]+/g, ' ').trim();
  }
  return text.replace(/\s+/g, ' ').trim();
}

export function analyzeHref(ticker: string): string {
  return `https://www.chartsignl.com/analyze?ticker=${encodeURIComponent(ticker.trim().toUpperCase())}`;
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** "Week of October 12–16, 2026" → the following Mon–Fri, "Oct 19–23". */
export function weekAheadSpan(weekLabel: string): string | null {
  const match = weekLabel.match(/([A-Za-z]+)\s+(\d+)\s*[–-]\s*(\d+),\s*(\d{4})/);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1].toLowerCase());
  if (month < 0) return null;
  const year = Number(match[4]);
  const startDay = Number(match[2]);
  const endDay = Number(match[3]);
  const start = new Date(Date.UTC(year, month, startDay));
  const friday = new Date(start);
  if (endDay >= startDay) {
    friday.setUTCDate(endDay);
  } else {
    friday.setUTCMonth(friday.getUTCMonth() + 1);
    friday.setUTCDate(endDay);
  }
  const nextMonday = new Date(friday);
  nextMonday.setUTCDate(friday.getUTCDate() + 3);
  const nextFriday = new Date(nextMonday);
  nextFriday.setUTCDate(nextMonday.getUTCDate() + 4);
  const monthName = nextMonday.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  const endMonth = nextFriday.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  if (monthName === endMonth) {
    return `${monthName} ${nextMonday.getUTCDate()}–${nextFriday.getUTCDate()}`;
  }
  return `${monthName} ${nextMonday.getUTCDate()}–${endMonth} ${nextFriday.getUTCDate()}`;
}

export function signedPercent(value: number, digits = 1): string {
  const shown = Math.abs(value).toFixed(digits);
  if (value < 0) return `−${shown}%`;
  if (value > 0) return `+${shown}%`;
  return `${shown}%`;
}
