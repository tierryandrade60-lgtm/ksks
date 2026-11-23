import { useRef, useState } from 'react';
import {
  applyPresetToSettings,
  CrosshairStyle,
  DEFAULT_GRAPHICS_SETTINGS,
  GraphicsSettings,
  MAX_CAMERA_ZOOM,
  MIN_CAMERA_ZOOM,
  QualityPreset,
} from '../game/graphicsSettings';

const PURPLE_DOT_PATTERN =
  'radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.4px, transparent 1.5px), radial-gradient(circle, rgba(142, 145, 218, 0.34) 1.4px, transparent 1.5px)';

interface CartoonRangeSliderProps {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  forcedLandscape: boolean;
  onChange: (nextVal: number) => void;
}

function CartoonRangeSlider({
  label,
  valueText,
  min,
  max,
  step,
  value,
  forcedLandscape,
  onChange,
}: CartoonRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingPointerRef = useRef<number | null>(null);

  const computeValueFromPointer = (clientX: number, clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();

    // When forcedLandscape rotates appRootRef +90deg clockwise, stage left->right runs screen top->bottom
    const rawRatio = forcedLandscape
      ? (clientY - rect.top) / Math.max(rect.height, 1)
      : (clientX - rect.left) / Math.max(rect.width, 1);

    const clampedRatio = Math.min(1, Math.max(0, rawRatio));
    const rawVal = min + clampedRatio * (max - min);
    const snapped = Math.round((rawVal - min) / step) * step + min;
    const finalVal = Number(Math.min(max, Math.max(min, snapped)).toFixed(4));
    onChange(finalVal);
  };

  const ratio = Math.min(1, Math.max(0, (value - min) / Math.max(max - min, 0.0001)));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-cartoon text-[10px] font-bold uppercase tracking-wide text-indigo-100">
          {label}
        </span>
        <span className="font-cartoon text-[10px] font-bold tabular-nums text-white">
          {valueText}
        </span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.currentTarget.setPointerCapture(e.pointerId);
          draggingPointerRef.current = e.pointerId;
          computeValueFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingPointerRef.current !== e.pointerId) return;
          e.preventDefault();
          e.stopPropagation();
          computeValueFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (draggingPointerRef.current === e.pointerId) {
            e.stopPropagation();
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            draggingPointerRef.current = null;
          }
        }}
        onPointerCancel={(e) => {
          if (draggingPointerRef.current === e.pointerId) {
            e.stopPropagation();
            draggingPointerRef.current = null;
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(max, Number((value + step).toFixed(4))));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(min, Number((value - step).toFixed(4))));
          }
        }}
        className="relative flex h-6 w-full cursor-pointer items-center select-none focus:outline-none"
        style={{ touchAction: 'none' }}
      >
        <div
          className="relative h-2.5 w-full overflow-hidden rounded-full"
          style={{
            backgroundColor: '#171936',
            border: '2px solid #0B0D18',
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${ratio * 100}%`,
              backgroundColor: '#FFD147',
            }}
          />
        </div>

        <div
          className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${ratio * 100}%`,
            width: '16px',
            height: '16px',
            backgroundColor: '#FFD147',
            border: '2.5px solid #0B0D18',
            boxShadow: '0 1.5px 0 rgba(8, 10, 18, 0.85)',
          }}
        />
      </div>
    </div>
  );
}

interface GraphicsSettingsPanelProps {
  settings: GraphicsSettings;
  forcedLandscape?: boolean;
  onChange: (next: GraphicsSettings) => void;
  onUiSound?: () => void;
}

export function GraphicsSettingsPanel({
  settings,
  forcedLandscape = false,
  onChange,
  onUiSound,
}: GraphicsSettingsPanelProps) {
  const [open, setOpen] = useState(false);

  const selectPreset = (preset: QualityPreset) => {
    onUiSound?.();
    onChange(applyPresetToSettings(settings, preset));
  };

  const selectCrosshair = (crosshairStyle: CrosshairStyle) => {
    onUiSound?.();
    onChange({
      ...settings,
      crosshairStyle,
    });
  };

  return (
    <div
      className="fixed z-30 select-none"
      style={{
        top: 'max(6px, var(--stage-safe-top, 0px))',
        right: 'max(10px, var(--stage-safe-right, 0px))',
        touchAction: 'manipulation',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onPointerCancel={(e) => e.stopPropagation()}
    >
      {/* Fixed-position Toggle Button */}
      <button
        type="button"
        aria-label="Settings / Configurações"
        aria-expanded={open}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onUiSound?.();
          setOpen((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onUiSound?.();
            setOpen((prev) => !prev);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="flex items-center justify-center rounded-[3px] transition-transform active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        style={{
          width: 'clamp(36px, 5.6vw, 42px)',
          height: 'clamp(36px, 5.6vw, 42px)',
          backgroundColor: open ? '#1C1D3A' : '#353664',
          backgroundImage: PURPLE_DOT_PATTERN,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 5px 5px',
          border: '2.5px solid #0B0D18',
          boxShadow: open
            ? '1px 1.5px 0 rgba(8, 10, 18, 0.9), inset 0 0 0 1.5px rgba(185, 198, 255, 0.5)'
            : '2px 3px 0 rgba(8, 10, 18, 0.85), inset 0 0 0 1.5px rgba(155, 160, 230, 0.22)',
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
            stroke="#FFFFFF"
            strokeWidth="2.2"
          />
          <path
            d="M19.4 15a1.6 1.6 0 0 0 .32 1.76l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.46V21a1.94 1.94 0 1 1-3.88 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-.97H3a1.94 1.94 0 1 1 0-3.88h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.94 1.94 0 1 1 2.74-2.74l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.46V3a1.94 1.94 0 1 1 3.88 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.46.97H21a1.94 1.94 0 1 1 0 3.88h-.09a1.6 1.6 0 0 0-1.51 1.05Z"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Compact Positioned Popover */}
      {open && (
        <div
          className="absolute right-0 mt-1.5 w-[248px] max-w-[82vw] rounded-[5px] p-2.5"
          style={{
            top: '100%',
            backgroundColor: '#2A2B52',
            backgroundImage: PURPLE_DOT_PATTERN,
            backgroundSize: '11px 11px',
            backgroundPosition: '0 0, 5.5px 5.5px',
            border: '2.5px solid #0B0D18',
            boxShadow:
              '3px 4px 0 rgba(8, 10, 18, 0.88), inset 0 0 0 1.5px rgba(155, 160, 230, 0.24)',
          }}
        >
          <div className="mb-2 flex items-center justify-between border-b border-white/15 pb-1">
            <span
              className="font-cartoon text-[11px] font-bold uppercase italic tracking-wide text-white"
              style={{ textShadow: '0 1.5px 0 rgba(8, 10, 18, 0.9)' }}
            >
              Settings / Configurações
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {/* 1. Graphics: Low, Medium, High, Ultra */}
            <div className="flex flex-col gap-1">
              <span className="font-cartoon text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                Graphics
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(['low', 'medium', 'high', 'ultra'] as const).map((presetKey) => {
                  const active = settings.preset === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectPreset(presetKey);
                      }}
                      className="rounded-[3px] py-0.5 font-cartoon text-[9.5px] font-bold uppercase italic transition-transform active:scale-95 focus:outline-none"
                      style={{
                        backgroundColor: active ? '#5659A8' : '#1E2040',
                        color: active ? '#FFFFFF' : 'rgba(210, 216, 244, 0.8)',
                        border: '2px solid #0B0D18',
                        boxShadow: active
                          ? 'inset 0 0 0 1px rgba(215, 222, 255, 0.45)'
                          : 'none',
                      }}
                    >
                      {presetKey}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Crosshair */}
            <div className="flex flex-col gap-1">
              <span className="font-cartoon text-[10px] font-bold uppercase tracking-wide text-indigo-100">
                Crosshair
              </span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { value: 'circle-dot', label: 'Circle + Dot' },
                    { value: 'crosshair', label: 'Crosshair' },
                    { value: 'dot', label: 'Dot' },
                  ] as const
                ).map((opt) => {
                  const active = settings.crosshairStyle === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        selectCrosshair(opt.value);
                      }}
                      className="rounded-[3px] px-1 py-0.5 font-cartoon text-[9px] font-bold uppercase transition-transform active:scale-95 focus:outline-none truncate"
                      style={{
                        backgroundColor: active ? '#5659A8' : '#1E2040',
                        color: active ? '#FFFFFF' : 'rgba(210, 216, 244, 0.8)',
                        border: '2px solid #0B0D18',
                        boxShadow: active
                          ? 'inset 0 0 0 1px rgba(215, 222, 255, 0.45)'
                          : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Master Volume (0-100) */}
            <CartoonRangeSlider
              label="Master Volume"
              valueText={`${settings.masterVolume}%`}
              min={0}
              max={100}
              step={1}
              value={settings.masterVolume}
              forcedLandscape={forcedLandscape}
              onChange={(v) => onChange({ ...settings, masterVolume: v })}
            />

            {/* 4. Sensitivity (0-100) */}
            <CartoonRangeSlider
              label="Sensitivity"
              valueText={`${settings.sensitivity}`}
              min={0}
              max={100}
              step={1}
              value={settings.sensitivity}
              forcedLandscape={forcedLandscape}
              onChange={(v) => onChange({ ...settings, sensitivity: v })}
            />

            {/* 5. Camera Zoom */}
            <CartoonRangeSlider
              label="Camera Zoom"
              valueText={settings.cameraZoom.toFixed(1)}
              min={MIN_CAMERA_ZOOM}
              max={MAX_CAMERA_ZOOM}
              step={0.05}
              value={settings.cameraZoom}
              forcedLandscape={forcedLandscape}
              onChange={(v) => onChange({ ...settings, cameraZoom: v })}
            />

            {/* 6. Reset */}
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUiSound?.();
                onChange({ ...DEFAULT_GRAPHICS_SETTINGS });
              }}
              className="mt-0.5 w-full rounded-[3px] py-1 font-cartoon text-[10px] font-bold uppercase tracking-wide text-indigo-100 transition-transform active:scale-95 focus:outline-none"
              style={{
                backgroundColor: '#1E2040',
                border: '2px solid #0B0D18',
              }}
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
