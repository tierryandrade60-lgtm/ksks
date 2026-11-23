import { memo, useEffect, useRef, useState } from 'react';
import { MAP_REGISTRY, MapId } from '../game/maps';

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px)';

interface MapSelectorProps {
  selectedMapId: MapId;
  coins: number;
  onSelectMap: (mapId: MapId) => void;
  onBack: () => void;
}

export const MapSelector = memo(function MapSelector({
  selectedMapId,
  coins,
  onSelectMap,
  onBack,
}: MapSelectorProps) {
  const [shotTick, setShotTick] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const prevMapIdRef = useRef<MapId>(selectedMapId);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setShotTick((prev) => prev + 1);
    }, 4500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (prevMapIdRef.current !== selectedMapId) {
      prevMapIdRef.current = selectedMapId;
      setFadeKey((k) => k + 1);
    }
  }, [selectedMapId]);

  const handleCardSelect = (mapId: MapId) => {
    if (mapId !== selectedMapId) {
      setFadeKey((k) => k + 1);
    }
    onSelectMap(mapId);
  };

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col overflow-hidden select-none"
      style={{
        background:
          'radial-gradient(circle at 45% 42%, #7BC1FF 0%, #4281D6 56%, #23437D 100%)',
        paddingTop: 'max(10px, var(--stage-safe-top, 0px))',
        paddingBottom: 'max(10px, var(--stage-safe-bottom, 0px))',
        paddingLeft: 'max(14px, var(--stage-safe-left, 0px))',
        paddingRight: 'max(14px, var(--stage-safe-right, 0px))',
        touchAction: 'manipulation',
      }}
    >
      {/* Subtle Black Fade Overlay on Map Switch */}
      {fadeKey > 0 && (
        <div
          key={fadeKey}
          aria-hidden="true"
          className="animate-subtle-black-fade pointer-events-none absolute inset-0 z-30 bg-black"
        />
      )}

      {/* Toy-Box Radial Sky Rings */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.45) 0, rgba(255,255,255,0.45) 140px, transparent 141px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 265px, transparent 266px)',
        }}
      />

      {/* Top Header: Back Button + Title + Coin Balance */}
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
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
              className="font-cartoon font-bold italic uppercase tracking-wide text-white"
              style={{
                fontSize: 'clamp(11px, 1.6vw, 14px)',
                textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.9)',
              }}
            >
              Maps
            </span>
          </div>
        </div>

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

      {/* Two Map Cards Side by Side with 3 Zooming Screenshots Each */}
      <div className="relative z-10 flex flex-1 min-h-0 items-center justify-center py-2">
        <div
          className="grid w-full grid-cols-2 items-center gap-4 sm:gap-5"
          style={{ maxWidth: '580px' }}
        >
          {MAP_REGISTRY.map((map) => {
            const isSelected = map.id === selectedMapId;
            const shots = map.screenshots;
            const activeShotIdx = shotTick % shots.length;
            return (
              <div key={map.id} className="animate-cartoon-pop-in">
                <button
                  type="button"
                  onClick={() => handleCardSelect(map.id)}
                  aria-pressed={isSelected}
                  className="group flex w-full flex-col overflow-hidden rounded-[9px] p-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer active:scale-[0.97]"
                  style={{
                    backgroundColor: isSelected ? '#2F3369' : '#25274D',
                    backgroundImage: PURPLE_DOT_PATTERN,
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0, 6px 6px',
                    border: isSelected
                      ? '3px solid #FFD147'
                      : '2.5px solid #0B0D18',
                    boxShadow: isSelected
                      ? '4px 5px 0 rgba(8, 10, 18, 0.94), 0 0 0 2px rgba(255, 209, 71, 0.34)'
                      : '2px 3px 0 rgba(8, 10, 18, 0.84)',
                    filter: isSelected
                      ? 'grayscale(0%) saturate(1.06)'
                      : 'grayscale(100%) brightness(0.82)',
                    transform: isSelected
                      ? 'scale(1.03) translateY(-2px)'
                      : 'scale(0.97)',
                    transition:
                      'filter 340ms cubic-bezier(0.22, 1, 0.36, 1), transform 280ms cubic-bezier(0.22, 1, 0.36, 1), border-color 260ms ease, box-shadow 260ms ease, background-color 260ms ease',
                  }}
                >
                  {/* 3 Cycling Screenshots with Slow Zoom Animation */}
                  <div
                    className="relative w-full overflow-hidden rounded-[6px]"
                    style={{
                      aspectRatio: '16 / 9',
                      maxHeight: 'clamp(96px, 28vh, 148px)',
                      border: '2px solid #0B0D18',
                      backgroundColor: '#0B0E18',
                    }}
                  >
                    {shots.map((src, idx) => {
                      const isShotActive = idx === activeShotIdx;
                      return (
                        <img
                          key={`${map.id}-${src}-${isShotActive ? shotTick : 'idle'}`}
                          src={src}
                          alt={isShotActive ? map.name : ''}
                          aria-hidden={!isShotActive}
                          draggable={false}
                          referrerPolicy="no-referrer"
                          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                            isShotActive ? 'animate-map-shot-zoom opacity-100' : 'opacity-0'
                          }`}
                          style={{ willChange: 'transform, opacity' }}
                        />
                      );
                    })}
                  </div>

                  {/* Map Name Only Below */}
                  <div className="mt-2 flex items-center justify-center gap-2 pb-0.5">
                    <span
                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[#0B0D18] transition-transform duration-300"
                      style={{
                        backgroundColor: map.accentColor,
                        transform: isSelected ? 'scale(1.15)' : 'scale(0.9)',
                      }}
                    />
                    <span
                      className="font-cartoon font-bold italic uppercase tracking-wide transition-colors duration-250"
                      style={{
                        color: isSelected ? '#FFD147' : '#FFFFFF',
                        fontSize: 'clamp(13px, 1.9vw, 16px)',
                        textShadow: '0 1.5px 0 #0B0D18',
                      }}
                    >
                      {map.name}
                    </span>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
