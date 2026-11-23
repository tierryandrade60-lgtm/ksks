import {
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

interface FlyingCoin {
  id: number;
  startX: number;
  startY: number;
  burstX: number;
  burstY: number;
  targetX: number;
  targetY: number;
  startMs: number;
  durationMs: number;
}

export interface CoinHudHandle {
  spawnCoins: (fromX: number, fromY: number, coinAmount: number) => void;
}

interface CoinHudProps {
  coins: number;
  onCoinArrived?: () => void;
}

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.4px, transparent 1.5px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.4px, transparent 1.5px)';

/**
 * Top-bar Cartoon Coin Counter + Flying Coin Reward Burst Overlay.
 */
export const CoinHud = memo(
  forwardRef<CoinHudHandle, CoinHudProps>(function CoinHud(
    { coins, onCoinArrived },
    ref,
  ) {
    const counterBoxRef = useRef<HTMLDivElement | null>(null);
    const coinNodesRef = useRef<Record<number, HTMLDivElement | null>>({});
    const nextCoinIdRef = useRef(1);
    const flyingRef = useRef<FlyingCoin[]>([]);

    const [flyingCoins, setFlyingCoins] = useState<FlyingCoin[]>([]);
    const [displayCoins, setDisplayCoins] = useState(coins);
    const displayCoinsRef = useRef(coins);
    const targetCoinsRef = useRef(coins);
    targetCoinsRef.current = coins;

    const lastSoundAtRef = useRef(0);
    const pulseTimerRef = useRef<number>(0);

    // Smoothly interpolate coin number toward authoritative balance
    useEffect(() => {
      if (displayCoinsRef.current === coins) return;
      let raf = 0;
      const step = () => {
        const curr = displayCoinsRef.current;
        const target = targetCoinsRef.current;
        if (curr === target) return;
        const diff = target - curr;
        const delta =
          Math.abs(diff) <= 1 ? diff : Math.sign(diff) * Math.ceil(Math.abs(diff) * 0.24);
        const next = curr + delta;
        displayCoinsRef.current = next;
        setDisplayCoins(next);
        if (next !== target) {
          raf = requestAnimationFrame(step);
        }
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [coins]);

    useEffect(() => {
      return () => clearTimeout(pulseTimerRef.current);
    }, []);

    const triggerCounterPulse = () => {
      clearTimeout(pulseTimerRef.current);
      if (counterBoxRef.current) {
        counterBoxRef.current.style.transform = 'scale(1.18)';
      }
      pulseTimerRef.current = window.setTimeout(() => {
        if (counterBoxRef.current) {
          counterBoxRef.current.style.transform = 'scale(1)';
        }
      }, 130);
    };

  useImperativeHandle(
    ref,
    () => ({
      spawnCoins: (fromX: number, fromY: number) => {
        const box = counterBoxRef.current;
        const targetX = box
          ? box.offsetLeft + box.offsetWidth * 0.35
          : window.innerWidth - 135;
        const targetY = box ? box.offsetTop + box.offsetHeight * 0.5 : 26;

        const now = performance.now();
        const spawned: FlyingCoin[] = [];
        const visualCount = 5;
        for (let i = 0; i < visualCount; i++) {
          const angle = -Math.PI * 0.85 + (i / (visualCount - 1)) * Math.PI * 0.7;
          const burstDist = 28 + Math.random() * 24;
          spawned.push({
            id: nextCoinIdRef.current++,
            startX: fromX,
            startY: fromY,
            burstX: fromX + Math.cos(angle) * burstDist,
            burstY: fromY + Math.sin(angle) * burstDist - 12,
            targetX,
            targetY,
            startMs: now + i * 48,
            durationMs: 560,
          });
        }

        flyingRef.current = [...flyingRef.current, ...spawned];
        setFlyingCoins(flyingRef.current);
      },
    }),
    [],
  );

  // Animate flying coin paths at 60fps
  useEffect(() => {
    if (flyingCoins.length === 0) return;

    let raf = 0;
    const tick = () => {
      const now = performance.now();
      const remaining: FlyingCoin[] = [];
      let arrivedAny = false;

      for (const coin of flyingRef.current) {
        const el = coinNodesRef.current[coin.id];
        const elapsed = now - coin.startMs;

        if (elapsed < 0) {
          if (el) {
            el.style.opacity = '0';
          }
          remaining.push(coin);
          continue;
        }

        const t = Math.min(1, elapsed / coin.durationMs);
        if (t >= 1) {
          arrivedAny = true;
          continue;
        }

        // Phase 1 (0..0.28): burst outward near defeated Thug; Phase 2 (0.28..1): arc to counter
        let x: number;
        let y: number;
        let scale: number;
        if (t < 0.28) {
          const p = t / 0.28;
          const ease = 1 - Math.pow(1 - p, 2);
          x = coin.startX + (coin.burstX - coin.startX) * ease;
          y = coin.startY + (coin.burstY - coin.startY) * ease;
          scale = 0.6 + 0.5 * ease;
        } else {
          const p = (t - 0.28) / 0.72;
          const ease = p * p * (3 - 2 * p);
          x = coin.burstX + (coin.targetX - coin.burstX) * ease;
          y =
            coin.burstY +
            (coin.targetY - coin.burstY) * ease -
            Math.sin(p * Math.PI) * 34;
          scale = 1.1 - p * 0.35;
        }

        if (el) {
          el.style.opacity = '1';
          el.style.transform = `translate3d(${x - 10}px, ${y - 10}px, 0) scale(${scale})`;
        }
        remaining.push(coin);
      }

      if (arrivedAny) {
        triggerCounterPulse();
        if (now - lastSoundAtRef.current > 210) {
          lastSoundAtRef.current = now;
          onCoinArrived?.();
        }
      }

      if (remaining.length !== flyingRef.current.length) {
        flyingRef.current = remaining;
        setFlyingCoins(remaining);
      }

      if (remaining.length > 0) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flyingCoins.length, onCoinArrived]);

  return (
    <>
      {/* Top-Bar Coin Counter directly left of Death + Settings buttons */}
      <div
        ref={counterBoxRef}
        aria-label={`Coins: ${coins}`}
        className="pointer-events-none fixed z-30 flex items-center gap-1.5 rounded-[5px] px-2.5 select-none"
        style={{
          top: 'max(6px, var(--stage-safe-top, 0px))',
          right:
            'calc(max(10px, var(--stage-safe-right, 0px)) + clamp(36px, 5.6vw, 42px) * 2 + 16px)',
          height: 'clamp(36px, 5.6vw, 42px)',
          backgroundColor: '#2D2F5B',
          backgroundImage: PURPLE_DOT_PATTERN,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 5px 5px',
          border: '2.5px solid #0B0D18',
          boxShadow:
            '2px 3px 0 rgba(8, 10, 18, 0.85), inset 0 0 0 1.5px rgba(255, 215, 75, 0.25)',
          transform: 'scale(1)',
          transition: 'transform 130ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <svg
          width="17"
          height="17"
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
          className="font-cartoon font-extrabold italic tabular-nums text-white"
          style={{
            fontSize: 'clamp(12px, 1.7vw, 15px)',
            textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.92)',
          }}
        >
          {displayCoins}
        </span>
      </div>

      {/* Animated Flying Coin Particles */}
      {flyingCoins.map((coin) => (
        <div
          key={coin.id}
          ref={(el) => {
            coinNodesRef.current[coin.id] = el;
          }}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-40"
          style={{
            width: '20px',
            height: '20px',
            opacity: 0,
            willChange: 'transform, opacity',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9.5"
              fill="#FFD147"
              stroke="#0B0D18"
              strokeWidth="2.4"
            />
            <circle
              cx="12"
              cy="12"
              r="5.2"
              fill="#F5A623"
              stroke="#FFE78C"
              strokeWidth="1.3"
            />
          </svg>
        </div>
      ))}
    </>
  );
  }),
);
