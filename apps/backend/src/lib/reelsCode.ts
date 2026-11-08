import { createHmac, randomInt, timingSafeEqual } from 'crypto';

export interface ReelsCodeRecord {
  dayEt: string;
  codeHash: string;
  usedAt: string | null;
}

export interface ReelsCodeStore {
  get(dayEt: string): Promise<ReelsCodeRecord | null>;
  save(row: ReelsCodeRecord): Promise<void>;
}

const memory = new Map<string, ReelsCodeRecord>();

export const memoryReelsCodeStore: ReelsCodeStore = {
  async get(dayEt) {
    return memory.get(dayEt) ?? null;
  },
  async save(row) {
    memory.set(row.dayEt, { ...row });
  },
};

export function resetReelsCodeStoreForTests(): void {
  memory.clear();
}

function codeSecret(): string {
  const secret = process.env.REELS_CODE_SECRET || '';
  if (secret.length < 16) {
    throw new Error('REELS_CODE_SECRET is not configured');
  }
  return secret;
}

export function ownerPageSecret(): string {
  return process.env.REELS_OWNER_PAGE_SECRET || '';
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashCode(code: string): string {
  return createHmac('sha256', codeSecret()).update(code).digest('hex');
}

export function generateDisplayCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export async function getOrCreateDayCode(
  dayEt: string,
  store: ReelsCodeStore = memoryReelsCodeStore
): Promise<{ code: string; used: boolean }> {
  const existing = await store.get(dayEt);
  if (existing) {
    return { code: '', used: !!existing.usedAt };
  }

  const code = generateDisplayCode();
  await store.save({
    dayEt,
    codeHash: hashCode(code),
    usedAt: null,
  });
  return { code, used: false };
}

/**
 * Returns the plaintext code only when we just created it this process.
 * For later page loads, regenerate is impossible from the hash — so we keep
 * the plaintext in memory for the owner's same-day page.
 */
const plaintextForDay = new Map<string, string>();

export async function revealDayCode(
  dayEt: string,
  store: ReelsCodeStore = memoryReelsCodeStore
): Promise<{ code: string; used: boolean }> {
  const existing = await store.get(dayEt);
  if (!existing) {
    const created = await getOrCreateDayCode(dayEt, store);
    plaintextForDay.set(dayEt, created.code);
    return created;
  }
  const cached = plaintextForDay.get(dayEt);
  if (cached) {
    return { code: cached, used: !!existing.usedAt };
  }
  // Process restarted after the code was issued. Rotate so the owner page
  // still has something to show; the previous unused code is invalidated.
  if (!existing.usedAt) {
    const code = generateDisplayCode();
    await store.save({ dayEt, codeHash: hashCode(code), usedAt: null });
    plaintextForDay.set(dayEt, code);
    return { code, used: false };
  }
  return { code: '', used: true };
}

export async function consumeDayCode(
  dayEt: string,
  code: string,
  store: ReelsCodeStore = memoryReelsCodeStore,
  now = new Date()
): Promise<'ok' | 'missing' | 'invalid' | 'used'> {
  if (!/^\d{6}$/.test(code)) return 'invalid';

  let row = await store.get(dayEt);
  if (!row) {
    const created = await getOrCreateDayCode(dayEt, store);
    plaintextForDay.set(dayEt, created.code);
    row = await store.get(dayEt);
  }
  if (!row) return 'missing';
  if (row.usedAt) return 'used';
  if (!safeEqual(row.codeHash, hashCode(code))) return 'invalid';

  await store.save({
    ...row,
    usedAt: now.toISOString(),
  });
  return 'ok';
}

export function ownerSecretMatches(provided: string): boolean {
  const expected = ownerPageSecret();
  if (!expected || expected.length < 16) return false;
  return safeEqual(provided, expected);
}
