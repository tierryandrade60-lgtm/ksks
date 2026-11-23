import type { AabbCollider } from './physics';

export type MapId = 'existing' | 'test';

export interface MapDefinition {
  id: MapId;
  name: string;
  subtitle: string;
  description: string;
  accentColor: string;
  previewImage: string;
  screenshots: ReadonlyArray<string>;
  tags: ReadonlyArray<string>;
}

export const MAP_REGISTRY: ReadonlyArray<MapDefinition> = [
  {
    id: 'existing',
    name: 'Main Map',
    subtitle: 'Open Sky Baseplate',
    description:
      'Classic open-court grid baseplate with architectural pillars, Bandit & Prisoner zones, and rival AI heroes.',
    accentColor: '#3CC6B8',
    previewImage: '/assets/maps/main-map.png',
    screenshots: [
      '/assets/maps/main-map.png',
      '/assets/maps/main-map-2.jpg',
      '/assets/maps/main-map-3.jpg',
    ],
    tags: ['Open Arena', 'AI Heroes', 'NPC Zones'],
  },
  {
    id: 'test',
    name: 'Map Testing',
    subtitle: 'Ultron Combat Lab',
    description:
      'Enclosed training arena with perimeter walls, ramps, elevated platforms, decorative blocks, and 3 Ultron combat bots.',
    accentColor: '#FF3B4E',
    previewImage: '/assets/maps/map-testing.png',
    screenshots: [
      '/assets/maps/map-testing.png',
      '/assets/maps/map-testing-2.jpg',
      '/assets/maps/map-testing-3.jpg',
    ],
    tags: ['Walled Arena', 'Ramps & Platforms', 'Bot & IA Controls'],
  },
];

export function getMapById(id: string | null | undefined): MapDefinition {
  return MAP_REGISTRY.find((m) => m.id === id) ?? MAP_REGISTRY[0];
}

export interface RampCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  baseY: number;
  topY: number;
  /** Direction along which elevation climbs from baseY to topY */
  slopeAxis: 'x+' | 'x-' | 'z+' | 'z-';
}

export interface TestMapBoxDef {
  x: number;
  y: number; // bottom Y
  z: number;
  w: number;
  h: number;
  d: number;
  kind: 'wall' | 'platform' | 'block';
  color?: string;
}

export interface TestMapRampDef {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  baseY: number;
  topY: number;
  slopeAxis: 'x+' | 'x-' | 'z+' | 'z-';
}

export const TEST_MAP_HALF_INNER = 36;
export const TEST_MAP_WALL_THICKNESS = 1.6;
export const TEST_MAP_WALL_HEIGHT = 4.8;
export const TEST_MAP_HALF_OUTER = TEST_MAP_HALF_INNER + TEST_MAP_WALL_THICKNESS;

export const TEST_MAP_PLAYER_SPAWN = {
  x: 0,
  z: 5.5,
  facingYaw: 0,
} as const;

export const TEST_MAP_ROBOT_SPAWNS: ReadonlyArray<{
  id: string;
  x: number;
  z: number;
  facingYaw: number;
}> = [
  { id: 'robot-main-1', x: -3.4, z: -5.5, facingYaw: Math.PI },
  { id: 'robot-main-2', x: 0.0, z: -5.5, facingYaw: Math.PI },
  { id: 'robot-main-3', x: 3.4, z: -5.5, facingYaw: Math.PI },
];

const W = TEST_MAP_HALF_INNER;
const T = TEST_MAP_WALL_THICKNESS;
const H = TEST_MAP_WALL_HEIGHT;

export const TEST_MAP_BOXES: ReadonlyArray<TestMapBoxDef> = [
  // 4 Perimeter Walls enclosing the square arena
  { x: 0, y: 0, z: -(W + T * 0.5), w: W * 2 + T * 2, h: H, d: T, kind: 'wall' },
  { x: 0, y: 0, z: W + T * 0.5, w: W * 2 + T * 2, h: H, d: T, kind: 'wall' },
  { x: -(W + T * 0.5), y: 0, z: 0, w: T, h: H, d: W * 2, kind: 'wall' },
  { x: W + T * 0.5, y: 0, z: 0, w: T, h: H, d: W * 2, kind: 'wall' },

  // West Elevated Platform
  { x: -19, y: 0, z: 0, w: 10, h: 2.2, d: 18, kind: 'platform' },
  // East Elevated Platform
  { x: 19, y: 0, z: 0, w: 10, h: 2.2, d: 18, kind: 'platform' },
  // North High Lookout Platform
  { x: 0, y: 0, z: -23, w: 18, h: 2.6, d: 8, kind: 'platform' },
  // South Training Deck Platform
  { x: 0, y: 0, z: 22.5, w: 16, h: 1.6, d: 7, kind: 'platform' },

  // Decorative & Cover Blocks (preserving clean center sightlines)
  { x: -11.8, y: 0, z: -12.5, w: 2.6, h: 2.6, d: 2.6, kind: 'block', color: '#29406E' },
  { x: 11.8, y: 0, z: -12.5, w: 2.6, h: 2.6, d: 2.6, kind: 'block', color: '#29406E' },
  { x: -11.2, y: 0, z: 2.0, w: 2.0, h: 1.8, d: 3.4, kind: 'block', color: '#334E82' },
  { x: 11.2, y: 0, z: 2.0, w: 2.0, h: 1.8, d: 3.4, kind: 'block', color: '#334E82' },
  { x: -27.5, y: 0, z: -24.5, w: 4.0, h: 3.2, d: 4.0, kind: 'block', color: '#243860' },
  { x: 27.5, y: 0, z: -24.5, w: 4.0, h: 3.2, d: 4.0, kind: 'block', color: '#243860' },
  { x: -27.5, y: 0, z: 24.5, w: 3.6, h: 2.4, d: 3.6, kind: 'block', color: '#2E4678' },
  { x: 27.5, y: 0, z: 24.5, w: 3.6, h: 2.4, d: 3.6, kind: 'block', color: '#2E4678' },
  // Stacked accent crate blocks atop West/East platforms
  { x: -21.5, y: 2.2, z: 0, w: 2.2, h: 1.4, d: 2.2, kind: 'block', color: '#3A5894' },
  { x: 21.5, y: 2.2, z: 0, w: 2.2, h: 1.4, d: 2.2, kind: 'block', color: '#3A5894' },
];

export const TEST_MAP_RAMPS: ReadonlyArray<TestMapRampDef> = [
  // West Platform North & South Ramps
  { minX: -21, maxX: -17, minZ: -14.5, maxZ: -9, baseY: 0, topY: 2.2, slopeAxis: 'z+' },
  { minX: -21, maxX: -17, minZ: 9, maxZ: 14.5, baseY: 0, topY: 2.2, slopeAxis: 'z-' },
  // East Platform North & South Ramps
  { minX: 17, maxX: 21, minZ: -14.5, maxZ: -9, baseY: 0, topY: 2.2, slopeAxis: 'z+' },
  { minX: 17, maxX: 21, minZ: 9, maxZ: 14.5, baseY: 0, topY: 2.2, slopeAxis: 'z-' },
  // North High Lookout West & East Ramps
  { minX: -15.5, maxX: -9, minZ: -25, maxZ: -21, baseY: 0, topY: 2.6, slopeAxis: 'x+' },
  { minX: 9, maxX: 15.5, minZ: -25, maxZ: -21, baseY: 0, topY: 2.6, slopeAxis: 'x-' },
  // South Training Deck Center Ramp
  { minX: -3.2, maxX: 3.2, minZ: 14.5, maxZ: 19, baseY: 0, topY: 1.6, slopeAxis: 'z+' },
];

export const TEST_MAP_OBSTACLE_COLLIDERS: ReadonlyArray<AabbCollider> = TEST_MAP_BOXES.map(
  (b) => ({
    minX: b.x - b.w * 0.5,
    maxX: b.x + b.w * 0.5,
    minY: b.y,
    maxY: b.y + b.h,
    minZ: b.z - b.d * 0.5,
    maxZ: b.z + b.d * 0.5,
  }),
);

export function computeRampHeightAt(
  x: number,
  z: number,
  ramp: RampCollider,
): number {
  let t = 0;
  switch (ramp.slopeAxis) {
    case 'x+':
      t = (x - ramp.minX) / Math.max(0.001, ramp.maxX - ramp.minX);
      break;
    case 'x-':
      t = (ramp.maxX - x) / Math.max(0.001, ramp.maxX - ramp.minX);
      break;
    case 'z+':
      t = (z - ramp.minZ) / Math.max(0.001, ramp.maxZ - ramp.minZ);
      break;
    case 'z-':
      t = (ramp.maxZ - z) / Math.max(0.001, ramp.maxZ - ramp.minZ);
      break;
  }
  const clamped = Math.max(0, Math.min(1, t));
  return ramp.baseY + (ramp.topY - ramp.baseY) * clamped;
}
