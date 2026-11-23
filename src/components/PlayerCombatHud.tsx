import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  ActiveStatusEffect,
  MultiKillEvent,
  PlayerCombatTelemetry,
  StatusEffectCategory,
} from '../game/statusEffectTypes';

export interface PlayerCombatHudHandle {
  updateTelemetry: (telemetry: PlayerCombatTelemetry) => void;
  triggerMultiKill: (event: MultiKillEvent) => void;
  reset: () => void;
}

const MAX_PROTECTED_TAGS = 8;

const STATUS_SLOTS: ReadonlyArray<{
  id: StatusEffectCategory;
  accent: string;
  bg: string;
  defaultLabel: string;
  defaultDesc: string;
}> = [
  {
    id: 'shield',
    accent: '#38BDF8',
    bg: '#13263B',
    defaultLabel: 'Active Shield',
    defaultDesc: 'Absorbs incoming damage.',
  },
  {
    id: 'health-recovery',
    accent: '#4ADE80',
    bg: '#132D22',
    defaultLabel: 'Health Recovery',
    defaultDesc: 'Restoring health over time.',
  },
  {
    id: 'dot',
    accent: '#FB923C',
    bg: '#381B14',
    defaultLabel: 'Damage Over Time',
    defaultDesc: 'Taking lingering damage.',
  },
  {
    id: 'paralyzed',
    accent: '#FACC15',
    bg: '#352B11',
    defaultLabel: 'Paralyzed',
    defaultDesc: 'Movement temporarily restricted.',
  },
  {
    id: 'no-powers',
    accent: '#F43F5E',
    bg: '#381427',
    defaultLabel: 'No Powers',
    defaultDesc: 'Abilities temporarily suppressed.',
  },
];

const PROTECTED_TAG_INDICES = Array.from({ length: MAX_PROTECTED_TAGS }, (_, i) => i);

interface StatusSlotRefs {
  root: HTMLButtonElement | null;
  veil: HTMLDivElement | null;
  timerText: HTMLSpanElement | null;
  visible: boolean;
  veilTransform: string;
  timerStr: string;
}

interface ProtectedTagRefs {
  root: HTMLDivElement | null;
  label: HTMLSpanElement | null;
  visible: boolean;
  opacity: string;
  transform: string;
  color: string;
}

function StatusEffectSvg({ id, color }: { id: StatusEffectCategory; color: string }) {
  switch (id) {
    case 'no-powers':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13.5 3L7 13H12L10.5 21L17 11H12L13.5 3Z"
            fill={color}
            fillOpacity="0.45"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <line
            x1="4.5"
            y1="4.5"
            x2="19.5"
            y2="19.5"
            stroke="#FF4D6D"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'paralyzed':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13.5 2.5L6.5 13H11.5L10.5 21.5L17.5 11H12.5L13.5 2.5Z"
            fill={color}
            stroke="#0B0D18"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M4 9.5C3.2 11 3.2 13 4 14.5M20 9.5C20.8 11 20.8 13 20 14.5"
            stroke="#FEF08A"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      );
    case 'health-recovery':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M9.5 4H14.5V9.5H20V14.5H14.5V20H9.5V14.5H4V9.5H9.5V4Z"
            fill={color}
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'dot':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12.4 2.8C12.4 2.8 17.5 6.8 17.5 12.2C17.5 15.8 15 19.2 12 19.8C8.9 19.2 6.5 15.9 6.5 12.4C6.5 9.6 8 7.4 9.3 6.2C9.3 6.2 9.4 9.1 11 10C10.5 7.2 12.4 2.8 12.4 2.8Z"
            fill={color}
            stroke="#0B0D18"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="14.5" r="2.2" fill="#FEF08A" />
        </svg>
      );
    case 'shield':
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3L19 6.2V11.6C19 16 15.9 19.4 12 21C8.1 19.4 5 16 5 11.6V6.2L12 3Z"
            fill={color}
            stroke="#0B0D18"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M12 6.2V17.4"
            stroke="#E0F2FE"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export const PlayerCombatHud = forwardRef<PlayerCombatHudHandle>(
  function PlayerCombatHud(_props, ref) {
    // Shield bar right of character
    const shieldRootRef = useRef<HTMLDivElement | null>(null);
    const shieldFillRef = useRef<HTMLDivElement | null>(null);
    const shieldTextRef = useRef<HTMLSpanElement | null>(null);

    // Side Energy Bar left of character (Silver Surfer Damage Absorption)
    const energyRootRef = useRef<HTMLDivElement | null>(null);
    const energyFillRef = useRef<HTMLDivElement | null>(null);
    const energyTextRef = useRef<HTMLSpanElement | null>(null);

    // Kill streak above player head
    const streakRootRef = useRef<HTMLDivElement | null>(null);
    const streakSvgRef = useRef<SVGSVGElement | null>(null);
    const streakFlamePathRef = useRef<SVGPathElement | null>(null);
    const streakTextRef = useRef<HTMLSpanElement | null>(null);

    // "Protected" torso tags
    const protectedRefs = useRef<ProtectedTagRefs[]>(
      Array.from({ length: MAX_PROTECTED_TAGS }, () => ({
        root: null,
        label: null,
        visible: false,
        opacity: '',
        transform: '',
        color: '',
      })),
    );

    const shieldCacheRef = useRef({
      visible: false,
      transform: '',
      fillTransform: '',
      fillColor: '',
      hpLabel: '',
    });
    const energyCacheRef = useRef({
      visible: false,
      transform: '',
      fillTransform: '',
      fillColor: '',
      ready: false,
      label: '',
    });
    const streakCacheRef = useRef({
      visible: false,
      transform: '',
      label: '',
      hot: false,
    });

    // Bottom-left status slots
    const statusRefs = useRef<Record<StatusEffectCategory, StatusSlotRefs>>({
      shield: { root: null, veil: null, timerText: null, visible: false, veilTransform: '', timerStr: '0.0s' },
      'health-recovery': { root: null, veil: null, timerText: null, visible: false, veilTransform: '', timerStr: '0.0s' },
      dot: { root: null, veil: null, timerText: null, visible: false, veilTransform: '', timerStr: '0.0s' },
      paralyzed: { root: null, veil: null, timerText: null, visible: false, veilTransform: '', timerStr: '0.0s' },
      'no-powers': { root: null, veil: null, timerText: null, visible: false, veilTransform: '', timerStr: '0.0s' },
    });

    const latestEffectsRef = useRef<
      Partial<Record<StatusEffectCategory, ActiveStatusEffect>>
    >({});
    const [inspectedEffect, setInspectedEffect] =
      useState<ActiveStatusEffect | null>(null);
    const inspectedIdRef = useRef<StatusEffectCategory | null>(null);

    const [multiKill, setMultiKill] = useState<MultiKillEvent | null>(null);
    const multiKillTimerRef = useRef<number>(0);

    const clearTelemetryNodes = useCallback(() => {
      if (shieldRootRef.current) shieldRootRef.current.style.display = 'none';
      shieldCacheRef.current.visible = false;
      if (energyRootRef.current) energyRootRef.current.style.display = 'none';
      energyCacheRef.current.visible = false;
      if (streakRootRef.current) streakRootRef.current.style.display = 'none';
      streakCacheRef.current.visible = false;
      for (let i = 0; i < MAX_PROTECTED_TAGS; i++) {
        const tag = protectedRefs.current[i];
        tag.visible = false;
        if (tag?.root) tag.root.style.display = 'none';
      }
      for (const slot of STATUS_SLOTS) {
        const refEntry = statusRefs.current[slot.id];
        refEntry.visible = false;
        if (refEntry?.root) refEntry.root.style.display = 'none';
        delete latestEffectsRef.current[slot.id];
      }
      inspectedIdRef.current = null;
      setInspectedEffect(null);
    }, []);

    useEffect(() => {
      return () => {
        window.clearTimeout(multiKillTimerRef.current);
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        updateTelemetry(t: PlayerCombatTelemetry) {
          // 1. Vertical Shield Bar beside right side of character
          const shieldRoot = shieldRootRef.current;
          const shieldCache = shieldCacheRef.current;
          if (shieldRoot) {
            if (t.playerShield.active && t.playerShield.maxHp > 0 && t.playerShield.hp > 0) {
              if (!shieldCache.visible) {
                shieldCache.visible = true;
                shieldRoot.style.display = 'flex';
              }
              const shieldTransform = `translate3d(${t.playerShield.screenX.toFixed(1)}px, ${t.playerShield.screenY.toFixed(1)}px, 0) translate(-50%, -50%)`;
              if (shieldCache.transform !== shieldTransform) {
                shieldCache.transform = shieldTransform;
                shieldRoot.style.transform = shieldTransform;
              }
              const ratio = Math.max(
                0,
                Math.min(1, t.playerShield.hp / t.playerShield.maxHp),
              );
              if (shieldFillRef.current) {
                const fillTransform = `scaleY(${ratio.toFixed(3)})`;
                if (shieldCache.fillTransform !== fillTransform) {
                  shieldCache.fillTransform = fillTransform;
                  shieldFillRef.current.style.transform = fillTransform;
                }
                if (shieldCache.fillColor !== t.playerShield.color) {
                  shieldCache.fillColor = t.playerShield.color;
                  shieldFillRef.current.style.backgroundColor = t.playerShield.color;
                }
              }
              if (shieldTextRef.current) {
                const hpLabel = `${Math.ceil(t.playerShield.hp)}`;
                if (shieldCache.hpLabel !== hpLabel) {
                  shieldCache.hpLabel = hpLabel;
                  shieldTextRef.current.textContent = hpLabel;
                }
              }
            } else if (shieldCache.visible) {
              shieldCache.visible = false;
              shieldRoot.style.display = 'none';
            }
          }

          // 1b. Vertical Cosmic Energy Bar beside left side of character (Silver Surfer)
          const energyRoot = energyRootRef.current;
          const energyCache = energyCacheRef.current;
          const energyData = t.playerEnergy;
          if (energyRoot) {
            if (energyData && energyData.active && energyData.maxEnergy > 0) {
              if (!energyCache.visible) {
                energyCache.visible = true;
                energyRoot.style.display = 'flex';
              }
              const energyTransform = `translate3d(${energyData.screenX.toFixed(1)}px, ${energyData.screenY.toFixed(1)}px, 0) translate(-50%, -50%)`;
              if (energyCache.transform !== energyTransform) {
                energyCache.transform = energyTransform;
                energyRoot.style.transform = energyTransform;
              }
              const eRatio = Math.max(
                0,
                Math.min(1, energyData.energy / energyData.maxEnergy),
              );
              if (energyFillRef.current) {
                const fillTransform = `scaleY(${eRatio.toFixed(3)})`;
                if (energyCache.fillTransform !== fillTransform) {
                  energyCache.fillTransform = fillTransform;
                  energyFillRef.current.style.transform = fillTransform;
                }
                if (energyCache.fillColor !== energyData.color) {
                  energyCache.fillColor = energyData.color;
                  energyFillRef.current.style.backgroundColor = energyData.color;
                }
                if (energyCache.ready !== energyData.ready) {
                  energyCache.ready = energyData.ready;
                  energyFillRef.current.style.boxShadow = energyData.ready
                    ? '0 0 10px rgba(224, 242, 254, 0.95)'
                    : 'none';
                }
              }
              if (energyTextRef.current) {
                const label = `${Math.floor(energyData.energy)}`;
                if (energyCache.label !== label) {
                  energyCache.label = label;
                  energyTextRef.current.textContent = label;
                }
              }
            } else if (energyCache.visible) {
              energyCache.visible = false;
              energyRoot.style.display = 'none';
            }
          }

          // 2. Kill Streak fire icon + number above player head (gray < 10, animated yellow/orange >= 10)
          const streakRoot = streakRootRef.current;
          const streakCache = streakCacheRef.current;
          if (streakRoot) {
            if (t.playerHeadVisible && t.killStreak >= 1) {
              if (!streakCache.visible) {
                streakCache.visible = true;
                streakRoot.style.display = 'flex';
              }
              const streakTransform = `translate3d(${t.playerHeadX.toFixed(1)}px, ${t.playerHeadY.toFixed(1)}px, 0) translate(-50%, -100%)`;
              if (streakCache.transform !== streakTransform) {
                streakCache.transform = streakTransform;
                streakRoot.style.transform = streakTransform;
              }
              const hot = t.killStreak >= 10;
              if (streakCache.hot !== hot) {
                streakCache.hot = hot;
                if (streakFlamePathRef.current) {
                  streakFlamePathRef.current.setAttribute('fill', hot ? '#FF9E1C' : '#9CA3AF');
                }
                if (streakSvgRef.current) {
                  if (hot) {
                    streakSvgRef.current.classList.add('animate-streak-fire');
                  } else {
                    streakSvgRef.current.classList.remove('animate-streak-fire');
                  }
                }
                if (streakTextRef.current) {
                  streakTextRef.current.style.color = hot ? '#FFD147' : '#D1D5DB';
                }
              }
              if (streakTextRef.current) {
                const label = `${t.killStreak}`;
                if (streakCache.label !== label) {
                  streakCache.label = label;
                  streakTextRef.current.textContent = label;
                }
              }
            } else if (streakCache.visible) {
              streakCache.visible = false;
              streakRoot.style.display = 'none';
            }
          }

          // 3. "Protected" torso popup tags
          for (let i = 0; i < MAX_PROTECTED_TAGS; i++) {
            const slot = protectedRefs.current[i];
            const snap = t.protectedTags[i];
            if (!slot?.root) continue;
            if (!snap || !snap.active) {
              if (slot.visible) {
                slot.visible = false;
                slot.root.style.display = 'none';
              }
              continue;
            }
            const p = Math.max(0, Math.min(1, snap.progress));
            const riseY = -p * 26;
            const scale = p < 0.22 ? 0.72 + (p / 0.22) * 0.38 : 1.1 - p * 0.14;
            const alpha = p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35) : 1;
            if (!slot.visible) {
              slot.visible = true;
              slot.root.style.display = 'block';
            }
            const opacityStr = alpha.toFixed(3);
            if (slot.opacity !== opacityStr) {
              slot.opacity = opacityStr;
              slot.root.style.opacity = opacityStr;
            }
            const tagTransform = `translate3d(${snap.screenX.toFixed(1)}px, ${(snap.screenY + riseY).toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
            if (slot.transform !== tagTransform) {
              slot.transform = tagTransform;
              slot.root.style.transform = tagTransform;
            }
            if (slot.label && slot.color !== snap.color) {
              slot.color = snap.color;
              slot.label.style.color = snap.color;
            }
          }

          // 4. Bottom-Left Status Effect square indicators (reuse latestEffectsRef map in place)
          const activeById = latestEffectsRef.current;
          for (let i = 0; i < STATUS_SLOTS.length; i++) {
            delete activeById[STATUS_SLOTS[i].id];
          }
          for (let i = 0; i < t.statusEffects.length; i++) {
            const eff = t.statusEffects[i];
            activeById[eff.id] = eff;
          }

          for (let i = 0; i < STATUS_SLOTS.length; i++) {
            const meta = STATUS_SLOTS[i];
            const slot = statusRefs.current[meta.id];
            const eff = activeById[meta.id];
            if (!slot?.root) continue;

            if (!eff) {
              if (slot.visible) {
                slot.visible = false;
                slot.root.style.display = 'none';
              }
              continue;
            }

            if (!slot.visible) {
              slot.visible = true;
              slot.root.style.display = 'flex';
            }
            const infinite = !Number.isFinite(eff.remainingSec);
            const ratio = infinite
              ? 1
              : Math.max(
                  0,
                  Math.min(1, eff.remainingSec / Math.max(0.1, eff.totalSec)),
                );
            if (slot.veil) {
              const veilTransform = `scaleY(${(1 - ratio).toFixed(3)})`;
              if (slot.veilTransform !== veilTransform) {
                slot.veilTransform = veilTransform;
                slot.veil.style.transform = veilTransform;
              }
            }
            if (slot.timerText) {
              const text = infinite
                ? 'ON'
                : eff.remainingSec >= 10
                  ? `${Math.ceil(eff.remainingSec)}s`
                  : `${eff.remainingSec.toFixed(1)}s`;
              if (slot.timerStr !== text) {
                slot.timerStr = text;
                slot.timerText.textContent = text;
              }
            }
          }

          if (inspectedIdRef.current && !activeById[inspectedIdRef.current]) {
            inspectedIdRef.current = null;
            setInspectedEffect(null);
          }
        },

        triggerMultiKill(event: MultiKillEvent) {
          window.clearTimeout(multiKillTimerRef.current);
          setMultiKill(event);
          multiKillTimerRef.current = window.setTimeout(() => {
            setMultiKill(null);
          }, 2200);
        },

        reset() {
          window.clearTimeout(multiKillTimerRef.current);
          setMultiKill(null);
          clearTelemetryNodes();
        },
      }),
      [clearTelemetryNodes],
    );

    const handleInspect = (id: StatusEffectCategory) => {
      const eff = latestEffectsRef.current[id];
      if (!eff) return;
      if (inspectedIdRef.current === id) {
        inspectedIdRef.current = null;
        setInspectedEffect(null);
      } else {
        inspectedIdRef.current = id;
        setInspectedEffect({ ...eff });
      }
    };

    const handleHoverStart = (id: StatusEffectCategory) => {
      const eff = latestEffectsRef.current[id];
      if (!eff) return;
      inspectedIdRef.current = id;
      setInspectedEffect({ ...eff });
    };

    const handleHoverEnd = (id: StatusEffectCategory) => {
      if (inspectedIdRef.current === id) {
        inspectedIdRef.current = null;
        setInspectedEffect(null);
      }
    };

    return (
      <div className="pointer-events-none fixed inset-0 z-20 overflow-hidden select-none">
        {/* Vertical Shield Health Bar (Right side of character) */}
        <div
          ref={shieldRootRef}
          style={{
            display: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            willChange: 'transform',
          }}
          className="flex-col items-center gap-[3px]"
        >
          <div
            className="relative flex flex-col justify-end overflow-hidden rounded-[4px]"
            style={{
              width: '10px',
              height: '58px',
              backgroundColor: '#121324',
              border: '2px solid #0B0D18',
              boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.88)',
            }}
          >
            <div
              ref={shieldFillRef}
              className="w-full"
              style={{
                height: '100%',
                backgroundColor: '#FF2956',
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0) 60%)',
                transformOrigin: 'bottom center',
                transform: 'scaleY(1)',
                willChange: 'transform',
                transition: 'transform 80ms linear',
              }}
            />
          </div>
          <span
            ref={shieldTextRef}
            className="font-cartoon text-[9.5px] font-extrabold italic leading-none tabular-nums text-white"
            style={{
              WebkitTextStroke: '2.5px #0B0D18',
              paintOrder: 'stroke fill',
              textShadow: '0 1px 0 #0B0D18',
            }}
          >
            100
          </span>
        </div>

        {/* Vertical Side Energy Bar (Left side of Silver Surfer) */}
        <div
          ref={energyRootRef}
          style={{
            display: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            willChange: 'transform',
          }}
          className="flex-col items-center gap-[3px]"
        >
          <div
            className="relative flex flex-col justify-end overflow-hidden rounded-[4px]"
            style={{
              width: '10px',
              height: '58px',
              backgroundColor: '#121526',
              border: '2px solid #0B0D18',
              boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.88)',
            }}
          >
            <div
              ref={energyFillRef}
              className="w-full"
              style={{
                height: '100%',
                backgroundColor: '#96E2FF',
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0) 65%)',
                transformOrigin: 'bottom center',
                transform: 'scaleY(0)',
                willChange: 'transform',
                transition: 'transform 80ms linear',
              }}
            />
            {/* 80-Energy Sonic Blast Unlock Threshold Tick */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0"
              style={{
                bottom: '80%',
                height: '1.5px',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0 3px #0B0D18',
              }}
            />
          </div>
          <span
            ref={energyTextRef}
            className="font-cartoon text-[9.5px] font-extrabold italic leading-none tabular-nums text-[#E0F2FE]"
            style={{
              WebkitTextStroke: '2.5px #0B0D18',
              paintOrder: 'stroke fill',
              textShadow: '0 1px 0 #0B0D18',
            }}
          >
            0
          </span>
        </div>

        {/* Kill Streak Fire Icon & Number Above Player Head */}
        <div
          ref={streakRootRef}
          style={{
            display: 'none',
            position: 'absolute',
            left: 0,
            top: 0,
            willChange: 'transform',
          }}
          className="items-center gap-1"
        >
          <svg
            ref={streakSvgRef}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              ref={streakFlamePathRef}
              d="M12.5 2.5C12.5 2.5 18 6.8 18 12.6C18 16.5 15.2 20 12 20.5C8.8 20 6 16.5 6 12.7C6 9.9 7.6 7.4 9 6C9 6 9.2 9.1 10.9 10.1C10.5 7 12.5 2.5 12.5 2.5Z"
              fill="#9CA3AF"
              stroke="#0B0D18"
              strokeWidth="1.8"
            />
          </svg>
          <span
            ref={streakTextRef}
            className="whitespace-nowrap font-cartoon text-[13px] font-extrabold italic leading-none tabular-nums"
            style={{
              color: '#D1D5DB',
              WebkitTextStroke: '2.8px #0B0D18',
              paintOrder: 'stroke fill',
              textShadow: '0 1.5px 0 #0B0D18',
            }}
          >
            1
          </span>
        </div>

        {/* Animated "Protected" Torso Popup Tags */}
        {PROTECTED_TAG_INDICES.map((idx) => (
          <div
            key={idx}
            ref={(el) => {
              protectedRefs.current[idx].root = el;
            }}
            style={{
              display: 'none',
              position: 'absolute',
              left: 0,
              top: 0,
              willChange: 'transform, opacity',
            }}
          >
            <span
              ref={(el) => {
                protectedRefs.current[idx].label = el;
              }}
              className="block whitespace-nowrap font-cartoon text-[14px] font-extrabold italic uppercase tracking-wide"
              style={{
                color: '#7DD3FC',
                WebkitTextStroke: '3.5px #0B0D18',
                paintOrder: 'stroke fill',
                textShadow: '1.5px 2px 0 #0B0D18',
              }}
            >
              Protected
            </span>
          </div>
        ))}

        {/* Multi-Kill Celebration Banner */}
        {multiKill && (
          <div
            key={multiKill.key}
            className="animate-cartoon-pop-in fixed left-1/2 z-30 -translate-x-1/2"
            style={{
              top: 'calc(max(12px, var(--stage-safe-top, 0px)) + 68px)',
            }}
          >
            <div
              className="rounded-[7px] px-3.5 py-1.5"
              style={{
                backgroundColor: '#1E142D',
                border: '2.5px solid #FFD147',
                boxShadow: '2.5px 3.5px 0 #0B0D18',
                transform: 'skewX(-8deg)',
              }}
            >
              <span
                className="block whitespace-nowrap font-cartoon font-extrabold italic uppercase tracking-wider text-[#FFD147]"
                style={{
                  fontSize: 'clamp(14px, 2.2vw, 20px)',
                  WebkitTextStroke: '3px #0B0D18',
                  paintOrder: 'stroke fill',
                  textShadow: '0 2px 0 #0B0D18',
                }}
              >
                {multiKill.title}
              </span>
            </div>
          </div>
        )}

        {/* Bottom-Left Status Effect Square Indicators */}
        <div
          className="fixed z-30 flex flex-col items-start gap-1.5"
          style={{
            left: 'max(12px, calc(var(--stage-safe-left, 0px) + 10px))',
            bottom: 'max(14px, calc(var(--stage-safe-bottom, 0px) + 10px))',
          }}
        >
          {/* Tap / Hover Effect Description Card */}
          {inspectedEffect && (
            <div
              className="animate-cartoon-pop-in pointer-events-none max-w-[210px] rounded-[6px] px-2.5 py-1.5"
              style={{
                backgroundColor: '#16182F',
                border: '2px solid #0B0D18',
                boxShadow: '2px 2.5px 0 rgba(8, 10, 18, 0.92)',
              }}
            >
              <div className="font-cartoon text-[10.5px] font-extrabold italic uppercase leading-tight text-white">
                {inspectedEffect.label}
              </div>
              <div className="mt-0.5 font-cartoon text-[9.5px] font-semibold leading-snug text-[#D6DCFF]">
                {inspectedEffect.description}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {STATUS_SLOTS.map((slot) => (
              <button
                key={slot.id}
                ref={(el) => {
                  statusRefs.current[slot.id].root = el;
                }}
                type="button"
                aria-label={slot.defaultLabel}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  handleInspect(slot.id);
                }}
                onMouseEnter={() => handleHoverStart(slot.id)}
                onMouseLeave={() => handleHoverEnd(slot.id)}
                style={{
                  display: 'none',
                  width: '36px',
                  height: '36px',
                  backgroundColor: slot.bg,
                  border: `2px solid ${slot.accent}`,
                  boxShadow: '1.5px 2px 0 #0B0D18',
                  touchAction: 'manipulation',
                }}
                className="pointer-events-auto relative items-center justify-center overflow-hidden rounded-[6px] focus:outline-none"
              >
                {/* Remaining Time Sweep Veil (top-to-bottom elapsed darken) */}
                <div
                  ref={(el) => {
                    statusRefs.current[slot.id].veil = el;
                  }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundColor: 'rgba(8, 10, 20, 0.68)',
                    transformOrigin: 'top center',
                    transform: 'scaleY(0)',
                  }}
                />

                <div className="relative z-10 -mt-1.5 flex items-center justify-center">
                  <StatusEffectSvg id={slot.id} color={slot.accent} />
                </div>

                <span
                  ref={(el) => {
                    statusRefs.current[slot.id].timerText = el;
                  }}
                  className="pointer-events-none absolute bottom-[1.5px] inset-x-0 z-10 text-center font-cartoon text-[8.5px] font-extrabold tabular-nums leading-none text-white"
                  style={{
                    textShadow: '0 1px 0 #0B0D18',
                  }}
                >
                  0.0s
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
