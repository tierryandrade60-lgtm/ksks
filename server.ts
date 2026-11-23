import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type NextFunction, type Request, type Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, 'dist');
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
const MAX_SESSIONS = 500;
const MAX_COINS = 1_000_000;
const MAX_STAMINA = 100;
const STAMINA_REGEN_DELAY_SEC = 1.0;

const CHARACTER_MAX_HP: Record<string, number> = {
  'scarlet-witch': 250,
  'phoenix-force': 250,
  'emma-frost': 250,
  hela: 250,
  magneto: 260,
  quicksilver: 240,
  'doctor-strange': 250,
  vision: 260,
  'agatha-harkness': 250,
  'invisible-woman': 250,
  vampire: 250,
  'captain-america': 260,
  thor: 270,
  'silver-surfer': 260,
  storm: 240,
};

const CHARACTER_SKIN_IDS: Record<string, ReadonlySet<string>> = {
  'scarlet-witch': new Set(['scarlet-default', 'supreme-sorceress', 'wanda-zombie']),
  'phoenix-force': new Set(['phoenix-default', 'dark-phoenix', 'white-phoenix']),
  'emma-frost': new Set(['emma-default', 'white-queen']),
  hela: new Set(['hela-default', 'white-hela']),
  magneto: new Set(),
  quicksilver: new Set(['quicksilver-default', 'speed']),
  'doctor-strange': new Set(['strange-default', 'ancient-one']),
  vision: new Set(),
  'agatha-harkness': new Set(),
  'invisible-woman': new Set(),
  vampire: new Set(),
  'captain-america': new Set(),
  thor: new Set(),
  'silver-surfer': new Set(),
  storm: new Set(),
};

const ALL_VALID_SKIN_IDS = new Set<string>([
  'scarlet-default',
  'supreme-sorceress',
  'wanda-zombie',
  'phoenix-default',
  'dark-phoenix',
  'white-phoenix',
  'emma-default',
  'white-queen',
  'hela-default',
  'white-hela',
  'quicksilver-default',
  'speed',
  'strange-default',
  'ancient-one',
]);

const SKIN_PRICES: Record<string, number> = {
  'dark-phoenix': 100,
};

export interface ValidatedGameState {
  selectedCharacterId: string;
  selectedSkinsByChar: Record<string, string>;
  unlockedSkins: string[];
  coins: number;
  stamina: number;
  maxStamina: number;
  staminaRegenDelayRemaining: number;
  sprintEnabled: boolean;
  flightEnabled: boolean;
  hp: number;
  maxHp: number;
  killStreak: number;
  activeAbilityLocked: boolean;
  invisibilityActive: boolean;
  forcefieldActive: boolean;
  updatedAtMs: number;
}

interface SessionRecord {
  sessionId: string;
  state: ValidatedGameState;
  lastTouchedMs: number;
}

const sessionStore = new Map<string, SessionRecord>();

function createDefaultState(): ValidatedGameState {
  return {
    selectedCharacterId: 'scarlet-witch',
    selectedSkinsByChar: {},
    unlockedSkins: [],
    coins: 0,
    stamina: MAX_STAMINA,
    maxStamina: MAX_STAMINA,
    staminaRegenDelayRemaining: 0,
    sprintEnabled: false,
    flightEnabled: false,
    hp: 250,
    maxHp: 250,
    killStreak: 0,
    activeAbilityLocked: false,
    invisibilityActive: false,
    forcefieldActive: false,
    updatedAtMs: Date.now(),
  };
}

function resolveSessionId(req: Request): string {
  const headerVal = req.header('x-session-id');
  if (headerVal && SESSION_ID_PATTERN.test(headerVal)) {
    return headerVal;
  }
  return crypto.randomUUID();
}

function getOrCreateSession(sessionId: string): SessionRecord {
  const existing = sessionStore.get(sessionId);
  if (existing) {
    existing.lastTouchedMs = Date.now();
    return existing;
  }
  if (sessionStore.size >= MAX_SESSIONS) {
    const oldestKey = sessionStore.keys().next().value;
    if (oldestKey) {
      sessionStore.delete(oldestKey);
    }
  }
  const created: SessionRecord = {
    sessionId,
    state: createDefaultState(),
    lastTouchedMs: Date.now(),
  };
  sessionStore.set(sessionId, created);
  return created;
}

function clampFinite(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function validateAndMergeState(
  prev: ValidatedGameState,
  payload: unknown,
): ValidatedGameState {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return prev;
  }
  const input = payload as Record<string, unknown>;

  const nextCharId =
    typeof input.selectedCharacterId === 'string' &&
    Object.prototype.hasOwnProperty.call(CHARACTER_MAX_HP, input.selectedCharacterId)
      ? input.selectedCharacterId
      : prev.selectedCharacterId;

  const maxHp = CHARACTER_MAX_HP[nextCharId] ?? 250;

  const nextUnlockedSet = new Set<string>(prev.unlockedSkins);
  if (Array.isArray(input.unlockedSkins)) {
    for (const skin of input.unlockedSkins) {
      if (typeof skin === 'string' && ALL_VALID_SKIN_IDS.has(skin)) {
        nextUnlockedSet.add(skin);
      }
    }
  }

  let nextCoins = prev.coins;
  if (typeof input.coins === 'number' && Number.isFinite(input.coins)) {
    const requestedCoins = Math.floor(clampFinite(input.coins, 0, MAX_COINS, prev.coins));
    // Guard against abrupt unearned coin inflation while allowing legitimate kill payouts & purchases
    const delta = requestedCoins - prev.coins;
    if (delta <= 1000) {
      nextCoins = requestedCoins;
    } else if (prev.coins === 0 && requestedCoins <= 5000) {
      // Initial client localStorage restore on fresh session boot
      nextCoins = requestedCoins;
    }
  }

  // Enforce skin purchase deduction if a priced skin was just unlocked
  if (typeof input.purchaseSkinId === 'string' && ALL_VALID_SKIN_IDS.has(input.purchaseSkinId)) {
    const price = SKIN_PRICES[input.purchaseSkinId] ?? 0;
    if (!prev.unlockedSkins.includes(input.purchaseSkinId) && prev.coins >= price) {
      nextCoins = Math.max(0, prev.coins - price);
      nextUnlockedSet.add(input.purchaseSkinId);
    }
  }

  const nextSkinsByChar: Record<string, string> = { ...prev.selectedSkinsByChar };
  if (
    input.selectedSkinsByChar &&
    typeof input.selectedSkinsByChar === 'object' &&
    !Array.isArray(input.selectedSkinsByChar)
  ) {
    for (const [charId, skinId] of Object.entries(
      input.selectedSkinsByChar as Record<string, unknown>,
    )) {
      if (
        typeof skinId === 'string' &&
        CHARACTER_SKIN_IDS[charId]?.has(skinId)
      ) {
        const price = SKIN_PRICES[skinId] ?? 0;
        if (price === 0 || nextUnlockedSet.has(skinId)) {
          nextSkinsByChar[charId] = skinId;
        }
      }
    }
  }

  const nextStamina = clampFinite(input.stamina, 0, MAX_STAMINA, prev.stamina);
  const nextRegenDelay = clampFinite(
    input.staminaRegenDelayRemaining,
    0,
    STAMINA_REGEN_DELAY_SEC,
    prev.staminaRegenDelayRemaining,
  );
  // Stamina 0 forces sprint disabled
  const requestedSprint =
    typeof input.sprintEnabled === 'boolean' ? input.sprintEnabled : prev.sprintEnabled;
  const nextSprint = nextStamina > 0 ? requestedSprint : false;

  const nextFlight =
    typeof input.flightEnabled === 'boolean' ? input.flightEnabled : prev.flightEnabled;

  // Enforce Magneto flight rule: offensive ground abilities cannot coexist with flight shield
  const activeAbilityLocked =
    nextCharId === 'magneto'
      ? nextFlight
      : typeof input.activeAbilityLocked === 'boolean'
        ? input.activeAbilityLocked
        : prev.activeAbilityLocked;

  const nextHp = Math.round(clampFinite(input.hp, 0, maxHp, prev.hp));
  const nextStreak = Math.floor(clampFinite(input.killStreak, 0, 9999, prev.killStreak));

  // Enforce Invisible Woman rules: Invisibility works grounded or flying and cannot coexist with active Forcefield abilities
  const requestedForcefield =
    nextCharId === 'invisible-woman'
      ? typeof input.forcefieldActive === 'boolean'
        ? input.forcefieldActive
        : prev.forcefieldActive
      : false;
  const requestedInvisibility =
    nextCharId === 'invisible-woman' && !requestedForcefield
      ? typeof input.invisibilityActive === 'boolean'
        ? input.invisibilityActive
        : prev.invisibilityActive
      : false;

  return {
    selectedCharacterId: nextCharId,
    selectedSkinsByChar: nextSkinsByChar,
    unlockedSkins: Array.from(nextUnlockedSet),
    coins: nextCoins,
    stamina: Number(nextStamina.toFixed(2)),
    maxStamina: MAX_STAMINA,
    staminaRegenDelayRemaining: Number(nextRegenDelay.toFixed(3)),
    sprintEnabled: nextSprint,
    flightEnabled: nextFlight,
    hp: nextHp,
    maxHp,
    killStreak: nextStreak,
    activeAbilityLocked,
    invisibilityActive: requestedInvisibility,
    forcefieldActive: requestedForcefield,
    updatedAtMs: Date.now(),
  };
}

async function startServer(): Promise<void> {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, serverTimeMs: Date.now() });
  });

  app.get('/api/session/restore', (req: Request, res: Response) => {
    const sessionId = resolveSessionId(req);
    const record = getOrCreateSession(sessionId);
    res.json({
      ok: true,
      sessionId: record.sessionId,
      state: record.state,
      serverTimeMs: Date.now(),
    });
  });

  app.post('/api/session/validate', (req: Request, res: Response) => {
    const sessionId = resolveSessionId(req);
    const record = getOrCreateSession(sessionId);
    record.state = validateAndMergeState(record.state, req.body);
    record.lastTouchedMs = Date.now();
    res.json({
      ok: true,
      sessionId: record.sessionId,
      state: record.state,
      serverTimeMs: Date.now(),
    });
  });

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ ok: false, error: 'Not found' });
  });

  if (!IS_PROD) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR, { index: false }));
    app.get('/{*splat}', (_req: Request, res: Response, next: NextFunction) => {
      const indexPath = path.resolve(DIST_DIR, 'index.html');
      if (!indexPath.startsWith(DIST_DIR + path.sep) || !fs.existsSync(indexPath)) {
        next();
        return;
      }
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
