/** Verbs that restate the price move instead of explaining it. */
const CIRCULAR_TITLE =
  /\b(soar|surg|jump|spike|rally|rallie|plunge|tumbl|sink|slid|slip|crash|pop|climb|drop)\w*\b|\bstock (is |)(up|down)\b|\bwhy .{0,30}\b(is|are) (up|down)\b|\bshould you buy\b|\bis .{0,20} still a buy\b/i;

/** Concrete figures — the signal that a description explains rather than describes. */
const HAS_FIGURES = /\$\s?\d|\d+(\.\d+)?\s?(%|percent|billion|million|bn|B\b|M\b)/i;

const EARNINGS_KEYWORD =
  /earnings|guidance|quarterly|results|revenue|Q[1-4]\s*(FY)?\s*20\d\d|outlook|forecast/i;

/** Primary sources carry the actual numbers. */
const PRIMARY_PUBLISHERS = /globenewswire|business ?wire|pr ?newswire|accesswire/i;

export interface CatalystCandidate {
  title: string;
  description: string | null;
  publisher: string;
  articleUrl: string;
  tickers: string[];
  keywords: string[];
  publishedUtc: string;
}

export interface Catalyst {
  text: string;
  url: string;
  isEarnings: boolean;
}

/**
 * Score an article on how well it EXPLAINS the move, not how recent it is.
 * Recency is a tiebreak, never the primary key — the article that broke the
 * story is usually older than the commentary reacting to it.
 */
export function scoreCatalyst(c: CatalystCandidate, ticker: string): number {
  let score = 0;
  const desc = c.description ?? '';

  if (HAS_FIGURES.test(desc)) score += 4; // the single strongest signal
  if (desc.length >= 80) score += 2; // substantive, not a stub
  if (c.keywords.some((k) => EARNINGS_KEYWORD.test(k))) score += 3;
  if (c.tickers[0] === ticker) score += 2;
  if (PRIMARY_PUBLISHERS.test(c.publisher)) score += 2;

  if (c.tickers.length > 6) score -= 4; // roundup / listicle
  if (CIRCULAR_TITLE.test(c.title) && !desc) score -= 5; // nothing but the move
  if (!desc) score -= 3; // title-only is a last resort

  return score;
}

/** Minimum score for a driver row's catalyst. Below this we treat it as absent. */
export const MIN_CATALYST_SCORE = 4;

/**
 * Build the reason text. Prefer the description's first one or two sentences;
 * fall back to the title only when there is no usable description.
 */
export function buildCatalystText(c: CatalystCandidate, maxLen = 160): string {
  const source = c.description && c.description.length >= 40 ? c.description : c.title;
  const sentences = source.match(/[^.!?]+[.!?]+/g) ?? [source];
  let out = '';
  for (const s of sentences) {
    if ((out + s).trim().length > maxLen) break;
    out += s;
  }
  if (!out) out = source.slice(0, maxLen);
  out = out.trim();
  // Trim to a word boundary if we had to hard-cut.
  if (out.length >= maxLen) out = out.slice(0, out.lastIndexOf(' ')) + '…';
  return out;
}

export function pickCatalyst(
  candidates: CatalystCandidate[],
  ticker: string
): Catalyst | null {
  const scored = candidates
    .map((c) => ({ c, score: scoreCatalyst(c, ticker) }))
    .filter((x) => x.score >= MIN_CATALYST_SCORE)
    .sort(
      (a, b) =>
        b.score - a.score || Date.parse(b.c.publishedUtc) - Date.parse(a.c.publishedUtc)
    );

  const best = scored[0];
  if (!best) return null;

  return {
    text: buildCatalystText(best.c),
    url: best.c.articleUrl,
    isEarnings: best.c.keywords.some((k) => EARNINGS_KEYWORD.test(k)),
  };
}
