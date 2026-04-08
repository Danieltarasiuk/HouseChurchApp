export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'house_church' | 'member';
  color: string;
  tooltipHtml: string;
}

export const HC_PALETTE = [
  '#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#457B9D',
  '#6A4C93', '#2D6A4F', '#F77F00', '#A8DADC', '#BC4749',
];

export function getHCColor(hcId: string, allHCIds: string[]): string {
  const idx = allHCIds.indexOf(hcId) % HC_PALETTE.length;
  return HC_PALETTE[idx >= 0 ? idx : 0];
}
