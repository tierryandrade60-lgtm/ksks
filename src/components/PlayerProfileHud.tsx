import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getCharacterPortraitUrl } from '../game/characterPortrait';
import { CharacterDefinition, resolveCharacterWithSkin } from '../game/characters';

export interface PlayerProfileHudHandle {
  setStamina: (stamina: number, maxStamina: number) => void;
}

interface PlayerProfileHudProps {
  character: CharacterDefinition;
  skinId?: string | null;
  hp: number;
  maxHp: number;
  healEvent?: { key: number; amount: number } | null;
}

const YELLOW_DOT_PATTERN =
  'radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.5px, transparent 1.6px), radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.5px, transparent 1.6px)';

const HEALTH_DOT_PATTERN =
  'radial-gradient(circle, rgba(160, 168, 200, 0.42) 1.15px, transparent 1.25px), radial-gradient(circle, rgba(160, 168, 200, 0.42) 1.15px, transparent 1.25px)';

const SEGMENTS = 10;
const SEGMENT_INDICES = Array.from({ length: SEGMENTS }, (_, i) => i);

/**
 * Left-side Cartoon Gameplay Profile HUD matching the visual reference:
 * slightly tilted square portrait on golden-yellow polka-dot backing,
 * slanted dark name banner, 10-segment white dotted health bar,
 * and a matching-width thin light-blue stamina bar directly underneath.
 */
export const PlayerProfileHud = memo(
  forwardRef<PlayerProfileHudHandle, PlayerProfileHudProps>(function PlayerProfileHud(
    { character, skinId, hp, maxHp, healEvent },
    ref,
  ) {
    const [healingActive, setHealingActive] = useState(false);
    const staminaFillRef = useRef<HTMLDivElement | null>(null);
    const lastStaminaTransformRef = useRef('');

    useImperativeHandle(
      ref,
      () => ({
        setStamina(stamina: number, maxStamina: number) {
          const el = staminaFillRef.current;
          if (!el) return;
          const ratio = Math.max(0, Math.min(1, stamina / Math.max(1, maxStamina)));
          const next = `scaleX(${ratio.toFixed(4)})`;
          if (lastStaminaTransformRef.current !== next) {
            lastStaminaTransformRef.current = next;
            el.style.transform = next;
          }
        },
      }),
      [],
    );

    useEffect(() => {
      if (!healEvent || healEvent.amount <= 0) return;
      setHealingActive(true);
      const id = window.setTimeout(() => {
        setHealingActive(false);
      }, 950);
      return () => window.clearTimeout(id);
    }, [healEvent]);

    const resolved = useMemo(
      () => resolveCharacterWithSkin(character, skinId),
      [character, skinId],
    );

    const portraitUrl = useMemo(
      () =>
        getCharacterPortraitUrl(
          `${character.id}:${resolved.skin?.id ?? 'base'}`,
          resolved.appearance,
        ),
      [character.id, resolved.skin?.id, resolved.appearance],
    );

    const clampedMax = Math.max(1, maxHp);
    const clampedHp = Math.max(0, Math.min(clampedMax, Math.round(hp)));
    const hpFraction = clampedHp / clampedMax;

    return (
      <div
        className="pointer-events-none fixed z-20 flex items-center select-none"
        style={{
          top: 'max(6px, var(--stage-safe-top, 0px))',
          left: 'max(10px, var(--stage-safe-left, 0px))',
          gap: 'clamp(6px, 1vw, 9px)',
        }}
      >
        {/* Left Tilted Character Portrait Frame */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 'clamp(52px, 8.2vw, 70px)',
            height: 'clamp(52px, 8.2vw, 70px)',
            backgroundColor: '#FFFFFF',
            border: healingActive ? '3px solid #4ADE80' : '3px solid #0B0D18',
            boxShadow: healingActive
              ? '2.5px 3.5px 0 rgba(8, 10, 18, 0.9), 0 0 12px rgba(74, 222, 128, 0.55)'
              : '2.5px 3.5px 0 rgba(8, 10, 18, 0.9)',
            transform: 'rotate(-2.8deg)',
            padding: '3px',
            transition: 'border-color 180ms ease, box-shadow 220ms ease',
          }}
        >
          <div
            className="relative h-full w-full overflow-hidden"
            style={{
              backgroundColor: '#FFD12A',
              backgroundImage: YELLOW_DOT_PATTERN,
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0, 5px 5px',
              border: '1.5px solid #0B0D18',
            }}
          >
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt={resolved.displayName}
                draggable={false}
                className="h-full w-full object-cover object-top scale-[1.18]"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{ backgroundColor: resolved.appearance.topPrimary }}
              />
            )}
          </div>
        </div>

        {/* Right Column: Name Banner + 10-Segment Health Bar + Thin Light-Blue Stamina Bar */}
        <div
          className="relative flex flex-col items-start"
          style={{ gap: 'clamp(3px, 0.55vw, 5px)' }}
        >
          {/* Slanted Dark Character Name Banner with Character-Specific Name Color */}
          <div
            className="px-2.5 py-[2px]"
            style={{
              backgroundColor: '#1C1E38',
              border: '2.5px solid #0B0D18',
              boxShadow: '2px 2.5px 0 rgba(8, 10, 18, 0.9)',
              transform: 'rotate(-1.8deg)',
            }}
          >
            <span
              className="block font-cartoon font-extrabold italic uppercase leading-tight tracking-tight"
              style={{
                fontSize: 'clamp(11px, 1.8vw, 15px)',
                color: resolved.nameColor,
                textShadow: '0 1.5px 0 #0B0D18',
              }}
            >
              {resolved.displayName}
            </span>
          </div>

          {/* 10-Segment White Polka-Dot Health Bar with Bold Outlined HP Readout */}
          <div
            className="relative flex items-center"
            style={{
              width: 'clamp(138px, 22vw, 205px)',
              height: 'clamp(20px, 3vw, 26px)',
              backgroundColor: '#0B0D18',
              border: healingActive ? '2.5px solid #4ADE80' : '2.5px solid #0B0D18',
              boxShadow: healingActive
                ? '2px 3px 0 rgba(8, 10, 18, 0.9), 0 0 12px rgba(74, 222, 128, 0.65)'
                : '2px 3px 0 rgba(8, 10, 18, 0.9)',
              transform: healingActive
                ? 'rotate(-1.3deg) scale(1.04)'
                : 'rotate(-1.3deg) scale(1)',
              gap: '2px',
              padding: '2px',
              transition:
                'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms ease, box-shadow 220ms ease',
            }}
          >
            {SEGMENT_INDICES.map((idx) => {
              const segStart = idx / SEGMENTS;
              const segEnd = (idx + 1) / SEGMENTS;
              const segFill = Math.max(
                0,
                Math.min(1, (hpFraction - segStart) / (segEnd - segStart)),
              );

              return (
                <div
                  key={idx}
                  className="relative h-full flex-1 overflow-hidden"
                  style={{
                    backgroundColor: '#232645',
                  }}
                >
                  <div
                    className="h-full w-full"
                    style={{
                      backgroundColor: healingActive ? '#A7F3D0' : '#F7F8FC',
                      backgroundImage: HEALTH_DOT_PATTERN,
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 4px 4px',
                      transformOrigin: 'left center',
                      transform: `scaleX(${segFill})`,
                      willChange: 'transform',
                      transition:
                        'transform 260ms cubic-bezier(0.22, 1, 0.36, 1), background-color 220ms ease',
                    }}
                  />
                </div>
              );
            })}

            {/* Centered Bold Outlined HP Value */}
            <span
              className="pointer-events-none absolute inset-0 flex items-center justify-center font-cartoon font-extrabold italic tabular-nums text-white"
              style={{
                fontSize: 'clamp(11px, 1.55vw, 14px)',
                WebkitTextStroke: '3px #0B0D18',
                paintOrder: 'stroke fill',
                textShadow: '0 1.5px 0 #0B0D18',
              }}
            >
              {clampedHp}/{clampedMax}
            </span>

            {/* Floating +HP Kill Healing Indicator */}
            {healEvent && (
              <div
                key={healEvent.key}
                className="pointer-events-none absolute -right-2 -top-5 flex items-center gap-0.5 rounded-[5px] px-1.5 py-[1px] font-cartoon font-extrabold italic leading-none text-[#4ADE80]"
                style={{
                  fontSize: 'clamp(12px, 1.8vw, 15px)',
                  backgroundColor: '#12291E',
                  border: '2px solid #0B0D18',
                  boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.9)',
                  textShadow: '0 1.5px 0 #0B0D18',
                  opacity: healingActive ? 1 : 0,
                  transform: healingActive
                    ? 'translateY(-4px) scale(1.06) rotate(-2deg)'
                    : 'translateY(-14px) scale(0.92) rotate(-2deg)',
                  transition: 'opacity 360ms ease, transform 420ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                +{healEvent.amount} HP
              </div>
            )}
          </div>

          {/* Thin Light-Blue Stamina Bar matching exact Health Bar width & slant */}
          <div
            className="relative overflow-hidden"
            style={{
              width: 'clamp(138px, 22vw, 205px)',
              height: 'clamp(7px, 1vw, 9px)',
              backgroundColor: '#131A30',
              border: '2px solid #0B0D18',
              boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.9)',
              transform: 'rotate(-1.3deg)',
              padding: '1px',
            }}
          >
            <div
              ref={staminaFillRef}
              className="h-full w-full"
              style={{
                background: 'linear-gradient(90deg, #38BDF8 0%, #7DD3FC 65%, #BAE6FD 100%)',
                transformOrigin: 'left center',
                transform: 'scaleX(1)',
                willChange: 'transform',
              }}
            />
          </div>
        </div>
      </div>
    );
  }),
);

