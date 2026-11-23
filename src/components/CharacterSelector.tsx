import { memo, useMemo, useState } from 'react';
import { AbilityDefinition, AbilityId } from '../game/abilityConfig';
import { getCharacterPortraitUrl } from '../game/characterPortrait';
import { CharacterDefinition, resolveCharacterWithSkin } from '../game/characters';
import { AbilityIcon } from './AbilityIcon';
import { CharacterPreviewCanvas } from './CharacterPreviewCanvas';

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px)';

const YELLOW_DOT_PATTERN =
  'radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.45px, transparent 1.55px)';

interface CharacterSelectorProps {
  characters: ReadonlyArray<CharacterDefinition>;
  selectedId: string;
  selectedSkinId?: string | null;
  unlockedSkins: ReadonlyArray<string>;
  coins: number;
  forcedLandscape: boolean;
  onSelectCharacter: (id: string) => void;
  onSelectSkin: (characterId: string, skinId: string) => void;
  onPurchaseSkin: (characterId: string, skinId: string, price: number) => void;
  onConfirmSelect: () => void;
  onBack?: () => void;
}

export const CharacterSelector = memo(function CharacterSelector({
  characters,
  selectedId,
  selectedSkinId,
  unlockedSkins,
  coins,
  forcedLandscape,
  onSelectCharacter,
  onSelectSkin,
  onPurchaseSkin,
  onConfirmSelect,
  onBack,
}: CharacterSelectorProps) {
  const selected =
    characters.find((c) => c.id === selectedId) ?? characters[0];

  const resolved = useMemo(
    () => resolveCharacterWithSkin(selected, selectedSkinId),
    [selected, selectedSkinId],
  );

  const [inspectedAbilityId, setInspectedAbilityId] = useState<AbilityId | null>(
    null,
  );

  const inspectedAbility: AbilityDefinition | null = useMemo(() => {
    if (!inspectedAbilityId) return null;
    return resolved.abilities.find((a) => a.id === inspectedAbilityId) ?? null;
  }, [inspectedAbilityId, resolved.abilities]);

  const basePortraitsById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const char of characters) {
      const charResolved = resolveCharacterWithSkin(char, null);
      const cacheKey = `${char.id}:${charResolved.skin?.id ?? 'base'}`;
      map[char.id] = getCharacterPortraitUrl(cacheKey, charResolved.appearance);
    }
    return map;
  }, [characters]);

  const portraitsById = useMemo(() => {
    const activeKey = `${selected.id}:${resolved.skin?.id ?? 'base'}`;
    const activeUrl = getCharacterPortraitUrl(activeKey, resolved.appearance);
    if (basePortraitsById[selected.id] === activeUrl) {
      return basePortraitsById;
    }
    return {
      ...basePortraitsById,
      [selected.id]: activeUrl,
    };
  }, [basePortraitsById, selected.id, resolved]);

  const skinPortraitsById = useMemo(() => {
    const map: Record<string, string> = {};
    if (selected.skins) {
      for (const skin of selected.skins) {
        map[skin.id] = getCharacterPortraitUrl(
          `${selected.id}:${skin.id}`,
          skin.appearance,
        );
      }
    }
    return map;
  }, [selected]);

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden select-none"
      onPointerDown={() => {
        if (inspectedAbilityId !== null) {
          setInspectedAbilityId(null);
        }
      }}
      style={{
        background:
          'radial-gradient(circle at 40% 45%, #7BC1FF 0%, #4281D6 56%, #23437D 100%)',
        paddingTop: 'max(8px, var(--stage-safe-top, 0px))',
        paddingBottom: 'max(8px, var(--stage-safe-bottom, 0px))',
        paddingLeft: 'max(12px, var(--stage-safe-left, 0px))',
        paddingRight: 'max(12px, var(--stage-safe-right, 0px))',
        touchAction: 'manipulation',
      }}
    >
      {/* Soft Toy-Box Radial Sky Rings Behind Stage */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 38% 50%, rgba(255,255,255,0.45) 0, rgba(255,255,255,0.45) 140px, transparent 141px), radial-gradient(circle at 38% 50%, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 260px, transparent 261px)',
        }}
      />

      {/* Top Header: Back + Title + Coin Balance */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1 font-cartoon font-bold italic uppercase tracking-wide text-white transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
              style={{
                backgroundColor: '#3E4182',
                backgroundImage: PURPLE_DOT_PATTERN,
                backgroundSize: '10px 10px',
                backgroundPosition: '0 0, 5px 5px',
                border: '2.5px solid #0B0D18',
                boxShadow: '2px 3px 0 rgba(8, 10, 18, 0.85)',
                fontSize: 'clamp(10.5px, 1.5vw, 13px)',
                textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.9)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M15 6L9 12L15 18"
                  stroke="#FFFFFF"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Back</span>
            </button>
          )}
          <div
            className="inline-flex items-center gap-2 rounded-[8px] px-3 py-1"
            style={{
              backgroundColor: '#2B2D5C',
              backgroundImage: PURPLE_DOT_PATTERN,
              backgroundSize: '11px 11px',
              backgroundPosition: '0 0, 5.5px 5.5px',
              border: '2.5px solid #0B0D18',
              boxShadow: '2px 3px 0 rgba(8, 10, 18, 0.85)',
            }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-[#0B0D18]"
              style={{ backgroundColor: resolved.preview.accentColor }}
            />
            <span
              className="font-cartoon font-bold italic uppercase tracking-wide text-white"
              style={{
                fontSize: 'clamp(11px, 1.65vw, 14px)',
                textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.9)',
              }}
            >
              Choose Character
            </span>
          </div>
        </div>

        {/* Synchronized Coin Balance */}
        <div
          aria-label={`Coins: ${coins}`}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5"
          style={{
            backgroundColor: '#252752',
            border: '2px solid #0B0D18',
            boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.78)',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="9.5"
              fill="#FFD147"
              stroke="#0B0D18"
              strokeWidth="2.2"
            />
            <circle
              cx="12"
              cy="12"
              r="5.5"
              fill="#F5A623"
              stroke="#FFE78C"
              strokeWidth="1.2"
            />
          </svg>
          <span
            className="font-cartoon font-bold tabular-nums text-white"
            style={{
              fontSize: 'clamp(11.5px, 1.4vw, 13.5px)',
              textShadow: '0 1px 0 rgba(8, 10, 18, 0.85)',
            }}
          >
            {coins}
          </span>
        </div>
      </header>

      {/* Main Content: Live 3D Character Preview + No-Scroll Side Info Panel */}
      <div className="relative z-10 flex flex-1 min-h-0 items-stretch gap-3 py-1">
        {/* Center 3D Character Preview */}
        <div className="relative flex-1 min-w-0 min-h-0 flex items-center justify-center">
          <CharacterPreviewCanvas
            character={selected}
            skinId={resolved.skin?.id}
            forcedLandscape={forcedLandscape}
          />
          <div
            className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 font-cartoon text-[9.5px] font-bold uppercase tracking-wider text-white/90"
            style={{
              backgroundColor: 'rgba(19, 25, 56, 0.68)',
              border: '1.5px solid rgba(11, 13, 24, 0.85)',
            }}
          >
            Drag to spin
          </div>
        </div>

        {/* Right Side Info Panel */}
        <aside
          key={selected.id}
          onPointerDown={(e) => e.stopPropagation()}
          className="animate-cartoon-pop-in relative flex flex-col justify-between overflow-hidden rounded-[10px] p-2.5 sm:p-3"
          style={{
            width: 'clamp(245px, 39vw, 345px)',
            backgroundColor: '#2B2D5C',
            backgroundImage: PURPLE_DOT_PATTERN,
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 6px 6px',
            border: '2.5px solid #0B0D18',
            boxShadow:
              '3px 4px 0 rgba(8, 10, 18, 0.88), inset 0 0 0 1.5px rgba(155, 160, 230, 0.24)',
          }}
        >
          {/* Adaptive Ability Tooltip */}
          {inspectedAbility && (
            <div
              key={inspectedAbility.id}
              role="status"
              className="pointer-events-none animate-cartoon-pop-in absolute left-2 right-2 z-30 rounded-[8px] px-2.5 py-2"
              style={{
                bottom: 'clamp(82px, 23vh, 98px)',
                backgroundColor: '#181A38',
                border: '2.5px solid #FFD147',
                boxShadow:
                  '2px 3.5px 0 rgba(8, 10, 18, 0.92), inset 0 0 0 1px rgba(255, 255, 255, 0.14)',
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span
                  className="font-cartoon text-[11px] font-bold italic uppercase text-white"
                  style={{ textShadow: '0 1px 0 #0B0D18' }}
                >
                  {inspectedAbility.name}
                </span>
                <span
                  className="rounded-[4px] px-1.5 py-[1px] font-cartoon text-[8.5px] font-bold uppercase text-[#0B0D18]"
                  style={{
                    backgroundColor: '#FFD147',
                    border: '1px solid #0B0D18',
                  }}
                >
                  {inspectedAbility.type}
                </span>
              </div>
              <p className="mt-1 font-cartoon text-[10px] leading-snug text-indigo-100">
                {inspectedAbility.description}
              </p>
            </div>
          )}

          {/* Top Identity Section */}
          <div className="flex flex-col gap-1">
            <h1
              className="font-cartoon font-bold italic uppercase leading-tight truncate"
              style={{
                fontSize: 'clamp(14px, 2.1vw, 19px)',
                color: resolved.nameColor,
                textShadow: '0 2px 0 rgba(8, 10, 18, 0.94)',
              }}
            >
              {resolved.displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-1">
              {selected.tags.map((tag, idx) => (
                <span
                  key={tag}
                  className="rounded-[4px] px-1.5 py-[1px] font-cartoon text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    backgroundColor: idx === 0 ? '#FFD147' : '#3C3F78',
                    color: idx === 0 ? '#0B0D18' : '#FFFFFF',
                    border: '1.5px solid #0B0D18',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <p
              className="font-cartoon text-indigo-100/90 leading-snug line-clamp-2"
              style={{ fontSize: 'clamp(9.8px, 1.2vw, 11.2px)' }}
            >
              {selected.description}
            </p>
          </div>

          {/* Middle Section: Compact Square Skin Cards (or Coming Soon) */}
          <div className="flex flex-col gap-1 py-0.5">
            <span
              className="font-cartoon text-[9px] font-bold uppercase tracking-wider text-indigo-200"
              style={{ textShadow: '0 1px 0 rgba(8, 10, 18, 0.9)' }}
            >
              Skins
            </span>

            {selected.skins && selected.skins.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {selected.skins.map((skin) => {
                  const isOwned =
                    skin.price === 0 || unlockedSkins.includes(skin.id);
                  const isEquipped = resolved.skin?.id === skin.id;
                  const canAfford = coins >= skin.price;
                  const skinPortrait = skinPortraitsById[skin.id];

                  return (
                    <button
                      key={skin.id}
                      type="button"
                      aria-label={`${skin.name} skin`}
                      aria-pressed={isEquipped}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isOwned) {
                          onSelectSkin(selected.id, skin.id);
                        } else {
                          onPurchaseSkin(selected.id, skin.id, skin.price);
                        }
                      }}
                      className="relative shrink-0 overflow-hidden rounded-[7px] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      style={{
                        width: 'clamp(50px, 6.8vw, 58px)',
                        height: 'clamp(50px, 6.8vw, 58px)',
                        backgroundColor: '#FFFFFF',
                        border: isEquipped
                          ? '3px solid #FFD147'
                          : '2.5px solid #0B0D18',
                        boxShadow: isEquipped
                          ? '2px 3px 0 rgba(8, 10, 18, 0.92)'
                          : '1.5px 2px 0 rgba(8, 10, 18, 0.78)',
                        padding: '2px',
                        opacity: !isOwned && !canAfford ? 0.72 : 1,
                      }}
                    >
                      <div
                        className="relative h-full w-full overflow-hidden rounded-[4px]"
                        style={{
                          backgroundColor: '#FFD12A',
                          backgroundImage: YELLOW_DOT_PATTERN,
                          backgroundSize: '9px 9px',
                          backgroundPosition: '0 0, 4.5px 4.5px',
                          border: '1.5px solid #0B0D18',
                        }}
                      >
                        {skinPortrait ? (
                          <img
                            src={skinPortrait}
                            alt={skin.name}
                            draggable={false}
                            className="h-full w-full object-cover object-top scale-[1.18]"
                          />
                        ) : (
                          <div
                            className="h-full w-full"
                            style={{ backgroundColor: skin.appearance.topPrimary }}
                          />
                        )}

                        {!isOwned && (
                          <span
                            className="absolute top-0.5 right-0.5 rounded-[3px] px-1 py-[0.5px] font-cartoon text-[7px] font-extrabold leading-none"
                            style={{
                              backgroundColor: canAfford ? '#FFD147' : '#3C2434',
                              color: canAfford ? '#0B0D18' : '#FF9494',
                              border: '1px solid #0B0D18',
                            }}
                          >
                            {skin.price}
                          </span>
                        )}

                        {isEquipped && (
                          <span
                            className="absolute bottom-0 inset-x-0 truncate bg-[#0B0D18]/85 px-0.5 py-[1px] text-center font-cartoon text-[6.8px] font-extrabold uppercase leading-none text-[#6EE7B7]"
                          >
                            {skin.shortName}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex w-full items-center justify-center rounded-[6px] px-2.5 py-1 font-cartoon text-[10px] font-bold italic uppercase tracking-wider text-indigo-200/80"
                style={{
                  backgroundColor: '#1E2044',
                  border: '2px solid #0B0D18',
                  boxShadow: 'inset 0 0 0 1px rgba(155, 160, 230, 0.14)',
                  cursor: 'default',
                }}
              >
                COMING SOON...
              </button>
            )}
          </div>

          {/* Bottom Section: Gameplay-Identical Ability Buttons with Hover/Tap Info */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span
                className="font-cartoon text-[9.5px] font-bold uppercase tracking-wider text-indigo-200"
                style={{ textShadow: '0 1px 0 rgba(8, 10, 18, 0.9)' }}
              >
                Abilities
              </span>
              <span className="font-cartoon text-[8.5px] font-semibold text-indigo-200/75">
                Hover / Tap for info
              </span>
            </div>

            <div
              className={`flex items-center justify-between ${
                resolved.abilities.length >= 5 ? 'gap-1' : 'gap-1.5'
              }`}
            >
              {resolved.abilities.map((ab) => {
                const isInspected = inspectedAbilityId === ab.id;
                const isFiveSlots = resolved.abilities.length >= 5;
                return (
                  <div
                    key={ab.id}
                    className="relative flex-1 flex justify-center"
                    style={{ transform: `rotate(${ab.tiltDeg}deg)` }}
                  >
                    {ab.maxCharges !== undefined && (
                      <div
                        className="pointer-events-none absolute z-20 flex items-center justify-center rounded-full font-cartoon font-bold italic text-white"
                        style={{
                          top: '-6px',
                          right: '-3px',
                          width: '17px',
                          height: '17px',
                          fontSize: '10px',
                          lineHeight: 1,
                          backgroundColor: '#E53540',
                          border: '1.5px solid #0B0D18',
                        }}
                      >
                        {ab.maxCharges}
                      </div>
                    )}

                    <button
                      type="button"
                      onPointerEnter={(e) => {
                        if (e.pointerType !== 'touch') {
                          setInspectedAbilityId(ab.id);
                        }
                      }}
                      onPointerLeave={(e) => {
                        if (e.pointerType !== 'touch') {
                          setInspectedAbilityId((prev) =>
                            prev === ab.id ? null : prev,
                          );
                        }
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setInspectedAbilityId((prev) =>
                          prev === ab.id ? null : ab.id,
                        );
                      }}
                      aria-label={`${ab.name}: ${ab.type}`}
                      className="flex flex-col items-center justify-center gap-[2px] rounded-[3px] p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      style={{
                        width: isFiveSlots
                          ? 'clamp(38px, 5.2vw, 47px)'
                          : 'clamp(46px, 6.4vw, 56px)',
                        height: isFiveSlots
                          ? 'clamp(38px, 5.2vw, 47px)'
                          : 'clamp(46px, 6.4vw, 56px)',
                        backgroundColor: isInspected ? '#474986' : '#353664',
                        backgroundImage: PURPLE_DOT_PATTERN,
                        backgroundSize: '10px 10px',
                        backgroundPosition: '0 0, 5px 5px',
                        border: isInspected
                          ? '2.5px solid #FFD147'
                          : '2.5px solid #0B0D18',
                        boxShadow:
                          '1.5px 2.5px 0 rgba(8, 10, 18, 0.86), inset 0 0 0 1px rgba(155, 160, 230, 0.22)',
                      }}
                    >
                      <AbilityIcon
                        id={ab.id}
                        size={isFiveSlots ? 15 : 17}
                        variant={resolved.skin?.id === 'speed' ? 'green' : 'blue'}
                      />
                      <span
                        className="font-cartoon font-bold italic uppercase text-center leading-[0.92] text-white"
                        style={{
                          fontSize: isFiveSlots
                            ? ab.name.length > 9
                              ? '5.4px'
                              : '6.2px'
                            : ab.name.length > 10
                              ? '6.2px'
                              : '7.4px',
                          textShadow: '0 1px 0 rgba(8, 10, 18, 0.94)',
                        }}
                      >
                        {ab.name}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Bar: Character Portrait Selector + Prominent SELECT CTA */}
      <footer className="relative z-10 flex shrink-0 items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          {characters.map((char) => {
            const isActive = char.id === selected.id;
            const portrait = portraitsById[char.id];

            return (
              <button
                key={char.id}
                type="button"
                aria-label={char.name}
                aria-pressed={isActive}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectCharacter(char.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectCharacter(char.id);
                  }
                }}
                className="relative shrink-0 overflow-hidden rounded-[7px] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{
                  width: 'clamp(46px, 7vh, 54px)',
                  height: 'clamp(46px, 7vh, 54px)',
                  backgroundColor: '#FFFFFF',
                  border: isActive
                    ? '3px solid #FFD147'
                    : '2.5px solid #0B0D18',
                  boxShadow: isActive
                    ? '2px 3px 0 rgba(8, 10, 18, 0.92)'
                    : '1.5px 2px 0 rgba(8, 10, 18, 0.78)',
                  padding: '2px',
                }}
              >
                <div
                  className="h-full w-full overflow-hidden rounded-[4px]"
                  style={{
                    backgroundColor: '#FFD12A',
                    backgroundImage: YELLOW_DOT_PATTERN,
                    backgroundSize: '9px 9px',
                    backgroundPosition: '0 0, 4.5px 4.5px',
                    border: '1.5px solid #0B0D18',
                  }}
                >
                  {portrait ? (
                    <img
                      src={portrait}
                      alt={char.name}
                      draggable={false}
                      className="h-full w-full object-cover object-top scale-[1.18]"
                    />
                  ) : (
                    <div
                      className="h-full w-full"
                      style={{ backgroundColor: char.appearance.topPrimary }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onConfirmSelect();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onConfirmSelect();
            }
          }}
          className="flex shrink-0 items-center justify-center gap-2 rounded-[10px] px-6 py-2 font-cartoon font-bold italic uppercase tracking-wider text-white transition-transform active:translate-y-[2px] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          style={{
            minHeight: 'clamp(42px, 6.8vh, 50px)',
            fontSize: 'clamp(14px, 2vw, 17px)',
            backgroundColor: '#2ECC71',
            border: '2.5px solid #0B0D18',
            boxShadow:
              '0 4px 0 #1A8A4A, 2px 6px 0 rgba(8, 10, 18, 0.85), inset 0 2px 0 rgba(255, 255, 255, 0.35)',
            textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.72)',
          }}
        >
          <span>SELECT</span>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6 12H18M18 12L13 7M18 12L13 17"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </footer>
    </div>
  );
});
