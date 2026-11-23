import { memo, useEffect, useState } from 'react';
import { getMapById, MapId } from '../game/maps';

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px)';

const YELLOW_DOT_PATTERN =
  'radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(217, 134, 0, 0.34) 1.45px, transparent 1.55px)';

interface MainMenuProps {
  selectedMapId: MapId;
  coins: number;
  onPlay: () => void;
  onOpenMaps: () => void;
}

export const MainMenu = memo(function MainMenu({
  selectedMapId,
  coins,
  onPlay,
  onOpenMaps,
}: MainMenuProps) {
  const activeMap = getMapById(selectedMapId);
  const shots = activeMap.screenshots;
  const [shotIdx, setShotIdx] = useState(0);
  const [switchPulse, setSwitchPulse] = useState(0);

  useEffect(() => {
    setShotIdx(0);
    setSwitchPulse((p) => p + 1);
  }, [selectedMapId]);

  useEffect(() => {
    if (shots.length <= 1) return;
    const timer = window.setInterval(() => {
      setShotIdx((prev) => (prev + 1) % shots.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [shots.length, selectedMapId]);

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between overflow-hidden select-none"
      style={{
        backgroundColor: '#1B2D58',
        paddingTop: 'max(14px, var(--stage-safe-top, 0px))',
        paddingBottom: 'max(14px, var(--stage-safe-bottom, 0px))',
        paddingLeft: 'max(18px, var(--stage-safe-left, 0px))',
        paddingRight: 'max(16px, var(--stage-safe-right, 0px))',
        touchAction: 'manipulation',
      }}
    >
      {/* Dynamic Immersive 3-Screenshot Cycling Backdrop of Active Map with Slow Zoom */}
      {shots.map((src, idx) => {
        const isActive = idx === shotIdx % shots.length;
        return (
          <img
            key={`${activeMap.id}-${src}-${isActive ? shotIdx : 'idle'}`}
            src={src}
            alt=""
            aria-hidden="true"
            draggable={false}
            referrerPolicy="no-referrer"
            className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
              isActive ? 'animate-map-shot-zoom opacity-100' : 'opacity-0'
            }`}
            style={{
              filter: 'saturate(1.08) contrast(1.04)',
              willChange: 'transform, opacity',
            }}
          />
        );
      })}

      {/* Subtle Black Fade when switching maps */}
      {switchPulse > 0 && (
        <div
          key={switchPulse}
          aria-hidden="true"
          className="animate-subtle-black-fade pointer-events-none absolute inset-0 z-[1] bg-black"
        />
      )}

      {/* Left-Weighted Cartoon Sky Scrim for Crisp Readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2]"
        style={{
          background:
            'linear-gradient(100deg, rgba(14, 24, 54, 0.88) 0%, rgba(20, 34, 74, 0.64) 36%, rgba(30, 56, 114, 0.18) 72%, rgba(16, 28, 60, 0.38) 100%)',
        }}
      />

      {/* Subtle Cartoon Halftone Accent Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[3] opacity-30"
        style={{
          backgroundImage: PURPLE_DOT_PATTERN,
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 9px 9px',
          maskImage: 'linear-gradient(95deg, rgba(0,0,0,0.85) 0%, transparent 55%)',
          WebkitMaskImage:
            'linear-gradient(95deg, rgba(0,0,0,0.85) 0%, transparent 55%)',
        }}
      />

      {/* Top Row: Game Logo & Play/Maps Buttons (Top-Left) + Status Badges (Top-Right) */}
      <div className="relative z-10 flex w-full items-start justify-between gap-4">
        {/* Top-Left: Enlarged Transparent Game Logo + Enlarged Menu Buttons Below */}
        <div className="flex flex-col items-start">
          <div className="animate-cartoon-pop-in">
            <img
              src="/assets/logo-heroes-pixel.png"
              alt="Heroes Pixel"
              draggable={false}
              referrerPolicy="no-referrer"
              className="pointer-events-none h-auto select-none object-contain"
              style={{
                width: 'clamp(225px, 29vw, 330px)',
                filter: 'drop-shadow(0 6px 14px rgba(6, 10, 24, 0.65))',
              }}
            />
          </div>

          {/* Enlarged Play & Maps Buttons Aligned Below Logo */}
          <nav
            aria-label="Main Menu"
            className="mt-3 flex flex-col items-start gap-3"
          >
            <div className="animate-cartoon-pop-in">
              <button
                type="button"
                onClick={onPlay}
                className="group flex items-center justify-between rounded-[8px] px-4.5 py-2.5 font-cartoon font-bold italic uppercase tracking-wider text-[#0B0D18] transition-all duration-150 ease-out hover:translate-x-1.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                style={{
                  width: 'clamp(206px, 27vw, 276px)',
                  backgroundColor: '#FFCC33',
                  backgroundImage: YELLOW_DOT_PATTERN,
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px',
                  border: '2.5px solid #0B0D18',
                  boxShadow:
                    '3.5px 4px 0 rgba(8, 10, 18, 0.92), inset 0 0 0 1.5px rgba(255, 245, 190, 0.48)',
                  fontSize: 'clamp(15px, 2vw, 18.5px)',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 5L19 12L7 19V5Z"
                      fill="#0B0D18"
                      stroke="#0B0D18"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>Play</span>
                </span>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="#0B0D18"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="animate-cartoon-pop-in" style={{ animationDelay: '60ms' }}>
              <button
                type="button"
                onClick={onOpenMaps}
                className="group flex items-center justify-between rounded-[8px] px-4.5 py-2.5 font-cartoon font-bold italic uppercase tracking-wider text-white transition-all duration-150 ease-out hover:translate-x-1.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                style={{
                  width: 'clamp(206px, 27vw, 276px)',
                  backgroundColor: '#353875',
                  backgroundImage: PURPLE_DOT_PATTERN,
                  backgroundSize: '10px 10px',
                  backgroundPosition: '0 0, 5px 5px',
                  border: '2.5px solid #0B0D18',
                  boxShadow:
                    '3.5px 4px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(175, 182, 245, 0.28)',
                  fontSize: 'clamp(14.5px, 1.9vw, 18px)',
                  textShadow: '0 1.5px 0 #0B0D18',
                }}
              >
                <span className="flex items-center gap-2.5">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3.5 6.5L9 4L15 6.5L20.5 4V17.5L15 20L9 17.5L3.5 20V6.5Z"
                      stroke="#FFD147"
                      strokeWidth="2.1"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 4V17.5M15 6.5V20"
                      stroke="#FFD147"
                      strokeWidth="1.8"
                    />
                  </svg>
                  <span>Maps</span>
                </span>
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-150 group-hover:translate-x-0.5"
                >
                  <path
                    d="M9 6L15 12L9 18"
                    stroke="#FFD147"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </nav>
        </div>

        {/* Top-Right: Active Map Pill & Coin Balance */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenMaps}
            className="inline-flex items-center gap-2 rounded-[7px] px-2.5 py-1 transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            style={{
              backgroundColor: 'rgba(37, 39, 82, 0.92)',
              backgroundImage: PURPLE_DOT_PATTERN,
              backgroundSize: '10px 10px',
              backgroundPosition: '0 0, 5px 5px',
              border: '2px solid #0B0D18',
              boxShadow: '2px 2.5px 0 rgba(8, 10, 18, 0.85)',
            }}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border border-[#0B0D18]"
              style={{ backgroundColor: activeMap.accentColor }}
            />
            <span
              className="font-cartoon font-bold italic uppercase tracking-wide text-white"
              style={{
                fontSize: 'clamp(10px, 1.3vw, 12px)',
                textShadow: '0 1px 0 rgba(8, 10, 18, 0.9)',
              }}
            >
              {activeMap.name}
            </span>
          </button>

          <div
            aria-label={`Coins: ${coins}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5"
            style={{
              backgroundColor: 'rgba(37, 39, 82, 0.92)',
              border: '2px solid #0B0D18',
              boxShadow: '1.5px 2px 0 rgba(8, 10, 18, 0.8)',
            }}
          >
            <svg
              width="14"
              height="14"
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
                fontSize: 'clamp(11px, 1.35vw, 13px)',
                textShadow: '0 1px 0 rgba(8, 10, 18, 0.85)',
              }}
            >
              {coins}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
