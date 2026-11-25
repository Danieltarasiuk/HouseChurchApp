export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: 'group' | 'member';
  color: string;
  tooltipHtml: string;
}

export const GROUP_PALETTE = [
  '#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#457B9D',
  '#6A4C93', '#2D6A4F', '#F77F00', '#A8DADC', '#BC4749',
];

export function getGroupColor(groupId: string, allGroupIds: string[]): string {
  const idx = allGroupIds.indexOf(groupId) % GROUP_PALETTE.length;
  return GROUP_PALETTE[idx >= 0 ? idx : 0];
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape text for a map tooltip's HTML (names and addresses come from PCO). */
export function escapeHtml(s: string | null | undefined): string {
  return (s ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
