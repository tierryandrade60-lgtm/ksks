export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra';
export type ShadowQuality = 'off' | 'medium' | 'high' | 'ultra';
export type ResolutionScale = 'low' | 'medium' | 'high' | 'native';
export type CloudQuality = 'low' | 'medium' | 'high' | 'ultra';
export type CrosshairStyle = 'circle-dot' | 'crosshair' | 'dot';

export interface GraphicsSettings {
  preset: QualityPreset;
  shadows: ShadowQuality;
  resolution: ResolutionScale;
  clouds: CloudQuality;
  distanceFog: boolean;
  windTrails: boolean;
  crosshairStyle: CrosshairStyle;
  masterVolume: number; // 0..100
  sensitivity: number; // 0..100
  cameraZoom: number; // 2.4..9.5 (default 4.65)
}

export const DEFAULT_CAMERA_ZOOM = 4.65;
export const MIN_CAMERA_ZOOM = 2.4;
export const MAX_CAMERA_ZOOM = 9.5;

export const QUALITY_PRESET_MAP: Record<
  QualityPreset,
  Pick<
    GraphicsSettings,
    'shadows' | 'resolution' | 'clouds' | 'distanceFog' | 'windTrails'
  >
> = {
  low: {
    shadows: 'off',
    resolution: 'low',
    clouds: 'low',
    distanceFog: true,
    windTrails: false,
  },
  medium: {
    shadows: 'medium',
    resolution: 'medium',
    clouds: 'medium',
    distanceFog: true,
    windTrails: true,
  },
  high: {
    shadows: 'high',
    resolution: 'high',
    clouds: 'high',
    distanceFog: true,
    windTrails: true,
  },
  ultra: {
    shadows: 'ultra',
    resolution: 'native',
    clouds: 'ultra',
    distanceFog: true,
    windTrails: true,
  },
};

export const DEFAULT_GRAPHICS_SETTINGS: GraphicsSettings = {
  preset: 'high',
  ...QUALITY_PRESET_MAP.high,
  crosshairStyle: 'dot',
  masterVolume: 75,
  sensitivity: 50,
  cameraZoom: DEFAULT_CAMERA_ZOOM,
};

const STORAGE_KEY = 'pixel_stride_settings_v2';

export function applyPresetToSettings(
  current: GraphicsSettings,
  preset: QualityPreset,
): GraphicsSettings {
  return {
    ...current,
    preset,
    ...QUALITY_PRESET_MAP[preset],
  };
}

export function loadGraphicsSettings(): GraphicsSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GRAPHICS_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GraphicsSettings>;

    const preset: QualityPreset =
      parsed.preset === 'low' ||
      parsed.preset === 'medium' ||
      parsed.preset === 'high' ||
      parsed.preset === 'ultra'
        ? parsed.preset
        : DEFAULT_GRAPHICS_SETTINGS.preset;

    const crosshairStyle: CrosshairStyle =
      parsed.crosshairStyle === 'circle-dot' ||
      parsed.crosshairStyle === 'crosshair' ||
      parsed.crosshairStyle === 'dot'
        ? parsed.crosshairStyle
        : DEFAULT_GRAPHICS_SETTINGS.crosshairStyle;

    const masterVolume =
      typeof parsed.masterVolume === 'number' && Number.isFinite(parsed.masterVolume)
        ? Math.min(100, Math.max(0, Math.round(parsed.masterVolume)))
        : DEFAULT_GRAPHICS_SETTINGS.masterVolume;

    const sensitivity =
      typeof parsed.sensitivity === 'number' && Number.isFinite(parsed.sensitivity)
        ? Math.min(100, Math.max(0, Math.round(parsed.sensitivity)))
        : DEFAULT_GRAPHICS_SETTINGS.sensitivity;

    const cameraZoom =
      typeof parsed.cameraZoom === 'number' && Number.isFinite(parsed.cameraZoom)
        ? Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, parsed.cameraZoom))
        : DEFAULT_CAMERA_ZOOM;

    return {
      preset,
      ...QUALITY_PRESET_MAP[preset],
      crosshairStyle,
      masterVolume,
      sensitivity,
      cameraZoom,
    };
  } catch {
    return { ...DEFAULT_GRAPHICS_SETTINGS };
  }
}

export function saveGraphicsSettings(settings: GraphicsSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / privacy mode errors
  }
}
