export interface SyncedGameState {
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
  invisibilityActive?: boolean;
  forcefieldActive?: boolean;
  updatedAtMs: number;
}

interface SessionResponse {
  ok: boolean;
  sessionId: string;
  state: SyncedGameState;
  serverTimeMs: number;
}

const SESSION_ID_STORAGE_KEY = 'pixel_stride_session_id_v1';

let inMemorySessionId: string | null = null;

function readSessionId(): string | null {
  if (inMemorySessionId) return inMemorySessionId;
  try {
    const saved = window.localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (saved && /^[a-zA-Z0-9-]{8,64}$/.test(saved)) {
      inMemorySessionId = saved;
      return saved;
    }
  } catch {
    // Ignore storage read restrictions
  }
  return null;
}

function storeSessionId(sessionId: string): void {
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(sessionId)) return;
  inMemorySessionId = sessionId;
  try {
    window.localStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
  } catch {
    // Ignore storage write restrictions
  }
}

function buildHeaders(includeJson: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const sid = readSessionId();
  if (sid) {
    headers['x-session-id'] = sid;
  }
  return headers;
}

export async function restoreServerSession(): Promise<SyncedGameState | null> {
  try {
    const res = await fetch('/api/session/restore', {
      method: 'GET',
      headers: buildHeaders(false),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SessionResponse;
    if (!data?.ok || !data.state) return null;
    if (data.sessionId) storeSessionId(data.sessionId);
    return data.state;
  } catch {
    return null;
  }
}

export async function validateServerState(
  partial: Partial<SyncedGameState> & { purchaseSkinId?: string },
): Promise<SyncedGameState | null> {
  try {
    const res = await fetch('/api/session/validate', {
      method: 'POST',
      headers: buildHeaders(true),
      body: JSON.stringify(partial),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as SessionResponse;
    if (!data?.ok || !data.state) return null;
    if (data.sessionId) storeSessionId(data.sessionId);
    return data.state;
  } catch {
    return null;
  }
}
