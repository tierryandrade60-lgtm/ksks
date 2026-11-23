import { forwardRef, useImperativeHandle, useRef } from 'react';
import { CrosshairStyle } from '../game/graphicsSettings';

export interface ReticleHudHandle {
  triggerHitMarker: () => void;
}

interface ReticleHudProps {
  styleType: CrosshairStyle;
}

/**
 * Aiming reticle supporting all 3 selectable styles (Dot, Circle + Dot, Crosshair)
 * plus 4 animated diagonal hit-confirmation ticks that fire strictly on confirmed target damage.
 */
export const ReticleHud = forwardRef<ReticleHudHandle, ReticleHudProps>(
  function ReticleHud({ styleType }, ref) {
    const markerGroupRef = useRef<HTMLDivElement | null>(null);
    const activeAnimRef = useRef<Animation | null>(null);

    useImperativeHandle(ref, () => ({
      triggerHitMarker() {
        const el = markerGroupRef.current;
        if (!el) return;
        activeAnimRef.current?.cancel();
        el.style.opacity = '1';
        activeAnimRef.current = el.animate(
          [
            { opacity: 1, transform: 'translate(-50%, -50%) scale(0.72)' },
            { opacity: 1, transform: 'translate(-50%, -50%) scale(1.12)', offset: 0.35 },
            { opacity: 0, transform: 'translate(-50%, -50%) scale(1.36)' },
          ],
          {
            duration: 185,
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            fill: 'forwards',
          },
        );
      },
    }));

    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-20"
        style={{
          left: 'calc(50% + 18px)',
          top: 'calc(50% - 22px)',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* 1. Dot */}
        {styleType === 'dot' && (
          <div
            className="rounded-full"
            style={{
              width: '6px',
              height: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.96)',
              boxShadow:
                '0 0 0 1.5px rgba(11, 13, 24, 0.55), 0 1px 3px rgba(11, 13, 24, 0.35)',
            }}
          />
        )}

        {/* 2. Circle + Dot */}
        {styleType === 'circle-dot' && (
          <div
            className="relative flex items-center justify-center rounded-full"
            style={{
              width: '20px',
              height: '20px',
              border: '1.8px solid rgba(255, 255, 255, 0.94)',
              boxShadow:
                '0 0 0 1px rgba(11, 13, 24, 0.45), inset 0 0 0 1px rgba(11, 13, 24, 0.35)',
            }}
          >
            <div
              className="rounded-full"
              style={{
                width: '4px',
                height: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.96)',
                boxShadow: '0 0 0 1px rgba(11, 13, 24, 0.5)',
              }}
            />
          </div>
        )}

        {/* 3. Classic 4-Prong Crosshair */}
        {styleType === 'crosshair' && (
          <div className="relative" style={{ width: '22px', height: '22px' }}>
            {/* Top */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '0px',
                width: '2px',
                height: '6px',
                transform: 'translateX(-50%)',
                backgroundColor: '#FFFFFF',
                borderRadius: '1px',
                boxShadow: '0 0 0 1px rgba(11, 13, 24, 0.55)',
              }}
            />
            {/* Bottom */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                bottom: '0px',
                width: '2px',
                height: '6px',
                transform: 'translateX(-50%)',
                backgroundColor: '#FFFFFF',
                borderRadius: '1px',
                boxShadow: '0 0 0 1px rgba(11, 13, 24, 0.55)',
              }}
            />
            {/* Left */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '0px',
                width: '6px',
                height: '2px',
                transform: 'translateY(-50%)',
                backgroundColor: '#FFFFFF',
                borderRadius: '1px',
                boxShadow: '0 0 0 1px rgba(11, 13, 24, 0.55)',
              }}
            />
            {/* Right */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                right: '0px',
                width: '6px',
                height: '2px',
                transform: 'translateY(-50%)',
                backgroundColor: '#FFFFFF',
                borderRadius: '1px',
                boxShadow: '0 0 0 1px rgba(11, 13, 24, 0.55)',
              }}
            />
          </div>
        )}

        {/* 4 Animated Hit Confirmation Diagonal Lines (wraps any reticle style cleanly) */}
        <div
          ref={markerGroupRef}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: '30px',
            height: '30px',
            opacity: 0,
            transform: 'translate(-50%, -50%) scale(1)',
            willChange: 'transform, opacity',
          }}
        >
          {[45, 135, 225, 315].map((deg) => (
            <div
              key={deg}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '7px',
                height: '2.4px',
                borderRadius: '2px',
                backgroundColor: '#FF4B64',
                boxShadow: '0 0 0 1px #0B0D18',
                transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(9px)`,
              }}
            />
          ))}
        </div>
      </div>
    );
  },
);
