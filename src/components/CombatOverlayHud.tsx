import { forwardRef, useImperativeHandle, useRef } from 'react';
import { NpcHudSnapshot } from '../game/npcSystem';

export interface CombatOverlayHudHandle {
  update: (snapshots: NpcHudSnapshot[]) => void;
}

const MAX_NPC_SLOTS = 24;
const BAR_SEGMENTS = 10;

const SLOT_INDICES = Array.from({ length: MAX_NPC_SLOTS }, (_, i) => i);
const SEGMENT_INDICES = Array.from({ length: BAR_SEGMENTS }, (_, i) => i);

interface SlotRefs {
  root: HTMLDivElement | null;
  arrow: HTMLDivElement | null;
  nameLabel: HTMLSpanElement | null;
  trailFill: HTMLDivElement | null;
  hpFill: HTMLDivElement | null;
  shieldWrap: HTMLDivElement | null;
  shieldFill: HTMLDivElement | null;
  dmgWrap: HTMLDivElement | null;
  dmgText: HTMLSpanElement | null;
  visible: boolean;
  rootTransform: string;
  arrowVisible: boolean;
  name: string;
  hpTransform: string;
  hpOpacity: string;
  trailTransform: string;
  trailOpacity: string;
  shieldVisible: boolean;
  shieldTransform: string;
  shieldColor: string;
  dmgVisible: boolean;
  dmgOpacity: string;
  dmgTransform: string;
  dmgTextStr: string;
}

/**
 * Zero-rerender floating Combat Overlay HUD driven imperatively every frame:
 * - Slanted segmented crimson NPC & AI Hero health bars with white delayed damage trail
 * - Downward crimson V-arrow strictly above the currently aim-assisted target
 * - Dynamic NPC / Hero name labels
 * - Larger floating comic damage numbers with minus sign ("-30") drifting away from target
 */
export const CombatOverlayHud = forwardRef<CombatOverlayHudHandle>(
  function CombatOverlayHud(_props, ref) {
    const slotsRef = useRef<SlotRefs[]>(
      Array.from({ length: MAX_NPC_SLOTS }, () => ({
        root: null,
        arrow: null,
        nameLabel: null,
        trailFill: null,
        hpFill: null,
        shieldWrap: null,
        shieldFill: null,
        dmgWrap: null,
        dmgText: null,
        visible: false,
        rootTransform: '',
        arrowVisible: false,
        name: 'Thug',
        hpTransform: '',
        hpOpacity: '',
        trailTransform: '',
        trailOpacity: '',
        shieldVisible: false,
        shieldTransform: '',
        shieldColor: '#38BDF8',
        dmgVisible: false,
        dmgOpacity: '',
        dmgTransform: '',
        dmgTextStr: '-0',
      })),
    );

    useImperativeHandle(ref, () => ({
      update(snapshots: NpcHudSnapshot[]) {
        const slots = slotsRef.current;
        for (let i = 0; i < MAX_NPC_SLOTS; i++) {
          const slot = slots[i];
          const snap = snapshots[i];
          const root = slot.root;
          if (!root) continue;

          if (!snap || !snap.visible) {
            if (slot.visible) {
              slot.visible = false;
              root.style.display = 'none';
            }
            continue;
          }

          if (!slot.visible) {
            slot.visible = true;
            root.style.display = 'block';
          }

          const rootTransform = `translate3d(${snap.screenX.toFixed(1)}px, ${snap.screenY.toFixed(1)}px, 0) translate(-50%, -100%) scale(${snap.scale.toFixed(3)})`;
          if (slot.rootTransform !== rootTransform) {
            slot.rootTransform = rootTransform;
            root.style.transform = rootTransform;
          }

          if (slot.arrow && slot.arrowVisible !== snap.isTargeted) {
            slot.arrowVisible = snap.isTargeted;
            slot.arrow.style.display = snap.isTargeted ? 'flex' : 'none';
          }

          if (slot.nameLabel && slot.name !== snap.name) {
            slot.name = snap.name;
            slot.nameLabel.textContent = snap.name;
          }

          const hpRatio =
            snap.maxHp > 0 ? Math.max(0, Math.min(1, snap.hp / snap.maxHp)) : 0;
          const trailRatio =
            snap.maxHp > 0
              ? Math.max(hpRatio, Math.min(1, snap.trailHp / snap.maxHp))
              : 0;
          const barOpacity = snap.hp > 0 ? '1' : '0';

          if (slot.hpFill) {
            const hpTransform = `scaleX(${hpRatio.toFixed(3)})`;
            if (slot.hpTransform !== hpTransform) {
              slot.hpTransform = hpTransform;
              slot.hpFill.style.transform = hpTransform;
            }
            if (slot.hpOpacity !== barOpacity) {
              slot.hpOpacity = barOpacity;
              slot.hpFill.style.opacity = barOpacity;
            }
          }
          if (slot.trailFill) {
            const trailTransform = `scaleX(${trailRatio.toFixed(3)})`;
            if (slot.trailTransform !== trailTransform) {
              slot.trailTransform = trailTransform;
              slot.trailFill.style.transform = trailTransform;
            }
            if (slot.trailOpacity !== barOpacity) {
              slot.trailOpacity = barOpacity;
              slot.trailFill.style.opacity = barOpacity;
            }
          }

          if (slot.shieldWrap && slot.shieldFill) {
            const shieldActive = Boolean(snap.shield?.active && snap.shield.hp > 0);
            if (slot.shieldVisible !== shieldActive) {
              slot.shieldVisible = shieldActive;
              slot.shieldWrap.style.display = shieldActive ? 'block' : 'none';
            }
            if (shieldActive && snap.shield) {
              const sRatio =
                snap.shield.maxHp > 0
                  ? Math.max(0, Math.min(1, snap.shield.hp / snap.shield.maxHp))
                  : 0;
              const shieldTransform = `scaleY(${sRatio.toFixed(3)})`;
              if (slot.shieldTransform !== shieldTransform) {
                slot.shieldTransform = shieldTransform;
                slot.shieldFill.style.transform = shieldTransform;
              }
              if (slot.shieldColor !== snap.shield.color) {
                slot.shieldColor = snap.shield.color;
                slot.shieldFill.style.backgroundColor = snap.shield.color;
              }
            }
          }

          if (slot.dmgWrap && slot.dmgText) {
            if (snap.damageNumber.active && snap.damageNumber.total > 0) {
              if (!slot.dmgVisible) {
                slot.dmgVisible = true;
                slot.dmgWrap.style.display = 'block';
              }
              const dmgOpacity = snap.damageNumber.opacity.toFixed(3);
              if (slot.dmgOpacity !== dmgOpacity) {
                slot.dmgOpacity = dmgOpacity;
                slot.dmgWrap.style.opacity = dmgOpacity;
              }
              const dmgTransform = `translate3d(${snap.damageNumber.offsetX.toFixed(1)}px, ${snap.damageNumber.offsetY.toFixed(1)}px, 0) translate(-50%, 0) scale(${snap.damageNumber.scale.toFixed(3)})`;
              if (slot.dmgTransform !== dmgTransform) {
                slot.dmgTransform = dmgTransform;
                slot.dmgWrap.style.transform = dmgTransform;
              }
              const textStr = `-${Math.round(snap.damageNumber.total)}`;
              if (slot.dmgTextStr !== textStr) {
                slot.dmgTextStr = textStr;
                slot.dmgText.textContent = textStr;
              }
            } else if (slot.dmgVisible) {
              slot.dmgVisible = false;
              slot.dmgWrap.style.display = 'none';
            }
          }
        }
      },
    }));

    return (
      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none">
        {SLOT_INDICES.map((idx) => (
          <div
            key={idx}
            ref={(el) => {
              slotsRef.current[idx].root = el;
            }}
            style={{
              display: 'none',
              position: 'absolute',
              left: 0,
              top: 0,
              transformOrigin: 'bottom center',
              willChange: 'transform',
            }}
          >
            {/* Target Aim-Assist Indicator: small crimson downward V-arrow */}
            <div
              ref={(el) => {
                slotsRef.current[idx].arrow = el;
              }}
              style={{ display: 'none' }}
              className="mb-1 flex items-center justify-center"
            >
              <svg
                width="20"
                height="16"
                viewBox="0 0 24 20"
                fill="none"
                aria-hidden="true"
                style={{
                  filter: 'drop-shadow(0 1.5px 0 #0B0D18)',
                }}
              >
                <path
                  d="M3.5 3.5L12 16.5L20.5 3.5L12 7.4L3.5 3.5Z"
                  fill="#FF2942"
                  stroke="#0B0D18"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Compact Enemy Name Tag + Slanted Segmented Red Bar with White Trail */}
            <div className="flex flex-col items-center">
              <span
                ref={(el) => {
                  slotsRef.current[idx].nameLabel = el;
                }}
                className="mb-[2px] whitespace-nowrap font-cartoon text-[10px] font-extrabold italic uppercase tracking-wide text-white"
                style={{
                  WebkitTextStroke: '2.5px #0B0D18',
                  paintOrder: 'stroke fill',
                  textShadow: '0 1px 0 #0B0D18',
                }}
              >
                Thug
              </span>

              <div
                className="relative overflow-hidden"
                style={{
                  width: '104px',
                  height: '14px',
                  backgroundColor: '#161724',
                  border: '2.5px solid #0B0D18',
                  boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.88)',
                  transform: 'skewX(-12deg)',
                }}
              >
                {/* White delayed recently-lost damage trail */}
                <div
                  ref={(el) => {
                    slotsRef.current[idx].trailFill = el;
                  }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: '100%',
                    backgroundColor: '#FFFFFF',
                    transformOrigin: 'left center',
                    transform: 'scaleX(1)',
                    willChange: 'transform',
                  }}
                />

                {/* Crimson immediate health fill */}
                <div
                  ref={(el) => {
                    slotsRef.current[idx].hpFill = el;
                  }}
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: '100%',
                    backgroundColor: '#E5283B',
                    backgroundImage:
                      'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.18) 100%)',
                    transformOrigin: 'left center',
                    transform: 'scaleX(1)',
                    willChange: 'transform',
                  }}
                />

                {/* Crisp comic segment separators */}
                <div className="pointer-events-none absolute inset-0 flex">
                  {SEGMENT_INDICES.map((segIdx) => (
                    <div
                      key={segIdx}
                      className="h-full flex-1"
                      style={{
                        borderRight:
                          segIdx < BAR_SEGMENTS - 1
                            ? '1.5px solid rgba(11, 13, 24, 0.85)'
                            : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Vertical Enemy Forcefield Shield Durability Bar beside HP bar */}
            <div
              ref={(el) => {
                slotsRef.current[idx].shieldWrap = el;
              }}
              style={{
                display: 'none',
                position: 'absolute',
                left: 'calc(100% + 7px)',
                bottom: 0,
                width: '7px',
                height: '28px',
                backgroundColor: '#161724',
                border: '2px solid #0B0D18',
                boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.88)',
                overflow: 'hidden',
              }}
            >
              <div
                ref={(el) => {
                  slotsRef.current[idx].shieldFill = el;
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: '#38BDF8',
                  transformOrigin: 'bottom center',
                  transform: 'scaleY(1)',
                  willChange: 'transform',
                }}
              />
            </div>

            {/* Independent Floating Aggregated Damage Number ("-30", larger, drifts away) */}
            <div
              ref={(el) => {
                slotsRef.current[idx].dmgWrap = el;
              }}
              style={{
                display: 'none',
                position: 'absolute',
                left: '50%',
                top: '8px',
                transformOrigin: 'center center',
                willChange: 'transform, opacity',
              }}
            >
              <span
                ref={(el) => {
                  slotsRef.current[idx].dmgText = el;
                }}
                className="block whitespace-nowrap font-cartoon font-extrabold italic leading-none text-[#FF3B4E]"
                style={{
                  fontSize: '25px',
                  WebkitTextStroke: '4.5px #0B0D18',
                  paintOrder: 'stroke fill',
                  textShadow: '2px 2.5px 0 #0B0D18',
                }}
              >
                -0
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  },
);
