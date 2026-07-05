export interface Coordinates {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

// Maps standard dental notation (e.g., 'UR6', 'LL3') to approximate X,Y percentages 
// on a standard panoramic x-ray. 
// Note: X is horizontal (0=left of image = patient's right side, 100=right of image = patient's left side)
// Y is vertical (0=top, 100=bottom)
// UR: Upper Right (Patient Right -> Image Left)
// UL: Upper Left (Patient Left -> Image Right)
// LR: Lower Right (Patient Right -> Image Left)
// LL: Lower Left (Patient Left -> Image Right)

export const dentalGridMap: Record<string, Coordinates> = {
  // Upper Right (Patient's Right, Left side of the image)
  'UR8': { x: 15, y: 35 },
  'UR7': { x: 20, y: 35 },
  'UR6': { x: 25, y: 35 },
  'UR5': { x: 30, y: 35 },
  'UR4': { x: 35, y: 35 },
  'UR3': { x: 40, y: 35 },
  'UR2': { x: 45, y: 35 },
  'UR1': { x: 48, y: 35 },

  // Upper Left (Patient's Left, Right side of the image)
  'UL1': { x: 52, y: 35 },
  'UL2': { x: 55, y: 35 },
  'UL3': { x: 60, y: 35 },
  'UL4': { x: 65, y: 35 },
  'UL5': { x: 70, y: 35 },
  'UL6': { x: 75, y: 35 },
  'UL7': { x: 80, y: 35 },
  'UL8': { x: 85, y: 35 },

  // Lower Right (Patient's Right, Left side of the image)
  'LR8': { x: 15, y: 65 },
  'LR7': { x: 20, y: 65 },
  'LR6': { x: 25, y: 65 },
  'LR5': { x: 30, y: 65 },
  'LR4': { x: 35, y: 65 },
  'LR3': { x: 40, y: 65 },
  'LR2': { x: 45, y: 65 },
  'LR1': { x: 48, y: 65 },

  // Lower Left (Patient's Left, Right side of the image)
  'LL1': { x: 52, y: 65 },
  'LL2': { x: 55, y: 65 },
  'LL3': { x: 60, y: 65 },
  'LL4': { x: 65, y: 65 },
  'LL5': { x: 70, y: 65 },
  'LL6': { x: 75, y: 65 },
  'LL7': { x: 80, y: 65 },
  'LL8': { x: 85, y: 65 },
};

export function getApproximateCoordinates(region: string): Coordinates {
  // If exact match exists, return it
  if (dentalGridMap[region]) {
    return dentalGridMap[region];
  }

  // Fallback defaults
  if (region.startsWith('UR')) return { x: 25, y: 35 };
  if (region.startsWith('UL')) return { x: 75, y: 35 };
  if (region.startsWith('LR')) return { x: 25, y: 65 };
  if (region.startsWith('LL')) return { x: 75, y: 65 };

  // Center default
  return { x: 50, y: 50 };
}
