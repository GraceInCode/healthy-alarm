export interface HsvRange {
  hMin: number;
  hMax: number;
  sMin: number;
  sMax: number;
  vMin: number;
  vMax: number;
  label: string;
}

export const SKY_HSV_RANGES: HsvRange[] = [
  // Clear blue sky
  { hMin: 180, hMax: 240, sMin: 30, sMax: 255, vMin: 80, vMax: 255, label: 'blue_sky' },
  // Overcast / grey sky — very low saturation
  { hMin: 0, hMax: 360, sMin: 0, sMax: 30, vMin: 140, vMax: 255, label: 'overcast_grey' },
  // White/light clouds
  { hMin: 0, hMax: 360, sMin: 0, sMax: 20, vMin: 200, vMax: 255, label: 'white_cloud' },
  // Sunrise / sunset orange-red band
  { hMin: 0, hMax: 30, sMin: 40, sMax: 220, vMin: 150, vMax: 255, label: 'sunrise_orange' },
  // Twilight blue-purple
  { hMin: 220, hMax: 280, sMin: 20, sMax: 180, vMin: 30, vMax: 140, label: 'twilight' },
  // Night / dark sky (stars, moon glow) — very dark, any hue
  { hMin: 0, hMax: 360, sMin: 0, sMax: 100, vMin: 0, vMax: 55, label: 'night_dark' },
];
