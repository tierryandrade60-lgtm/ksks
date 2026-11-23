import {
  CharacterGender,
  getCharacterById,
  resolveCharacterWithSkin,
} from './characters';

export type VoiceGender = CharacterGender;

export type VocalizationKind =
  | 'pain-light'
  | 'pain-heavy'
  | 'pain-repeated'
  | 'effort-jump'
  | 'effort-land'
  | 'effort-melee'
  | 'effort-heavy';

export interface SelectionVoiceConfig {
  key: string;
  gender: VoiceGender;
  characterName: string;
}

const MINOR_TITLE_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'at', 'to', 'for']);

/**
 * Normalizes uppercase roster display names (e.g. "SCARLET WITCH", "HELA") into
 * natural Title Case ("Scarlet Witch", "Hela") so speech synthesis pronounces
 * them as words rather than spelling acronyms, including future additions.
 */
export function formatAnnouncerCharacterName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const isAllUpper = cleaned === cleaned.toUpperCase() && cleaned !== cleaned.toLowerCase();
  if (!isAllUpper) {
    return cleaned;
  }

  return cleaned
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && MINOR_TITLE_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

export function resolveSelectionVoiceConfig(
  characterId: string,
  skinId?: string | null,
): SelectionVoiceConfig {
  const char = getCharacterById(characterId);
  const resolved = resolveCharacterWithSkin(char, skinId);
  const key = resolved.skin?.id ? `${char.id}:${resolved.skin.id}` : char.id;

  return {
    key,
    gender: resolved.gender,
    characterName: formatAnnouncerCharacterName(resolved.displayName),
  };
}

/**
 * Reusable anti-repeat + cooldown manager for both SFX variations and vocalizations.
 */
export class AudioCooldownManager {
  private readonly lastPlayedAt = new Map<string, number>();
  private readonly lastVariantIdx = new Map<string, number>();

  public canPlay(key: string, cooldownMs: number, nowMs = performance.now()): boolean {
    const prev = this.lastPlayedAt.get(key) ?? -Infinity;
    if (nowMs - prev < cooldownMs) {
      return false;
    }
    this.lastPlayedAt.set(key, nowMs);
    return true;
  }

  public markPlayed(key: string, nowMs = performance.now()): void {
    this.lastPlayedAt.set(key, nowMs);
  }

  public pickVariant(key: string, count: number): number {
    if (count <= 1) return 0;
    const prev = this.lastVariantIdx.get(key) ?? -1;
    let next = Math.floor(Math.random() * count);
    if (next === prev) {
      next = (prev + 1 + Math.floor(Math.random() * (count - 1))) % count;
    }
    this.lastVariantIdx.set(key, next);
    return next;
  }

  public reset(): void {
    this.lastPlayedAt.clear();
    this.lastVariantIdx.clear();
  }
}
