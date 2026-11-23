export type TransitionPhase = 'idle' | 'covering' | 'revealing';

interface ScreenTransitionProps {
  phase: TransitionPhase;
}

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.32) 2px, transparent 2.1px), radial-gradient(circle, rgba(142, 145, 218, 0.32) 2px, transparent 2.1px)';

/**
 * Playful, fast Cartoon 3D iris-wipe transition that covers scene swaps
 * cleanly and blocks accidental pointer taps during transitions.
 */
export function ScreenTransition({ phase }: ScreenTransitionProps) {
  if (phase === 'idle') return null;

  const isCovering = phase === 'covering';

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden pointer-events-auto select-none"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        key={phase}
        className={`flex items-center justify-center rounded-full ${
          isCovering ? 'animate-wipe-cover' : 'animate-wipe-reveal'
        }`}
        style={{
          width: '240vmax',
          height: '240vmax',
          flexShrink: 0,
          backgroundColor: '#252754',
          backgroundImage: PURPLE_DOT_PATTERN,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 10px 10px',
          border: '10px solid #0B0D18',
          boxShadow: 'inset 0 0 0 10px rgba(102, 168, 255, 0.35)',
          willChange: 'transform',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: '72px',
            height: '72px',
            backgroundColor: '#3CC6B8',
            border: '3.5px solid #0B0D18',
            boxShadow: '0 4px 0 rgba(8, 10, 18, 0.85)',
          }}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 2.8L14.7 8.4L20.8 9.3L16.4 13.6L17.4 19.7L12 16.8L6.6 19.7L7.6 13.6L3.2 9.3L9.3 8.4L12 2.8Z"
              fill="#FFFFFF"
              stroke="#0B0D18"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
