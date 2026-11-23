const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.45px, transparent 1.55px)';

interface DeathScreenProps {
  onRespawn: () => void;
  onChangeCharacter: () => void;
}

export function DeathScreen({
  onRespawn,
  onChangeCharacter,
}: DeathScreenProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="death-screen-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 select-none"
      style={{
        backgroundColor: 'rgba(10, 14, 28, 0.34)',
        touchAction: 'manipulation',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      <div
        className="animate-cartoon-pop-in relative w-full max-w-[356px] rounded-[14px] p-5 text-center"
        style={{
          backgroundColor: '#2B2D5C',
          backgroundImage: PURPLE_DOT_PATTERN,
          backgroundSize: '12px 12px',
          backgroundPosition: '0 0, 6px 6px',
          border: '3px solid #0B0D18',
          boxShadow:
            '4px 6px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 2px rgba(155, 160, 230, 0.25)',
        }}
      >
        {/* Playful Cartoon Skull Emblem */}
        <div
          className="mx-auto -mt-10 mb-2.5 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: '#E53540',
            border: '3px solid #0B0D18',
            boxShadow: '0 3px 0 rgba(8, 10, 18, 0.88)',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M12 3.5C7.6 3.5 4.2 6.7 4.2 10.8C4.2 13.3 5.4 15.4 7.3 16.7V19.2C7.3 19.9 7.9 20.5 8.6 20.5H15.4C16.1 20.5 16.7 19.9 16.7 19.2V16.7C18.6 15.4 19.8 13.3 19.8 10.8C19.8 6.7 16.4 3.5 12 3.5Z"
              fill="#FFFFFF"
              stroke="#0B0D18"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M8.4 10.2L10.3 12.1M10.3 10.2L8.4 12.1M13.7 10.2L15.6 12.1M15.6 10.2L13.7 12.1"
              stroke="#0B0D18"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <path
              d="M10.2 20.4V17.8M13.8 20.4V17.8"
              stroke="#0B0D18"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h2
          id="death-screen-title"
          className="font-cartoon text-2xl font-bold italic uppercase tracking-wide text-white"
          style={{ textShadow: '0 2.5px 0 rgba(8, 10, 18, 0.92)' }}
        >
          WIPEOUT!
        </h2>
        <p className="mt-1 font-cartoon text-xs font-medium text-indigo-100/90">
          Your character tumbled onto the baseplate.
        </p>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRespawn();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRespawn();
              }
            }}
            className="flex-1 rounded-[9px] px-4 py-2.5 font-cartoon text-sm font-bold italic uppercase tracking-wide text-white transition-transform active:translate-y-[2px] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{
              backgroundColor: '#2ECC71',
              border: '2.5px solid #0B0D18',
              boxShadow:
                '0 3.5px 0 #1A8A4A, 2px 5px 0 rgba(8, 10, 18, 0.85), inset 0 1.5px 0 rgba(255, 255, 255, 0.35)',
              textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.72)',
            }}
          >
            RESPAWN
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChangeCharacter();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChangeCharacter();
              }
            }}
            className="flex-1 rounded-[9px] px-3 py-2.5 font-cartoon text-xs font-bold italic uppercase tracking-wide text-white transition-transform active:translate-y-[2px] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{
              backgroundColor: '#F59E0B',
              border: '2.5px solid #0B0D18',
              boxShadow:
                '0 3.5px 0 #B56E04, 2px 5px 0 rgba(8, 10, 18, 0.85), inset 0 1.5px 0 rgba(255, 255, 255, 0.35)',
              textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.72)',
            }}
          >
            CHANGE CHARACTER
          </button>
        </div>
      </div>
    </div>
  );
}
