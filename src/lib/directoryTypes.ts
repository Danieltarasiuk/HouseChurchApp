/**
 * Member directory visibility vocabulary, shared by the server rules
 * (directory.ts) and the settings UI. Client-safe: no database access.
 */

export const DIRECTORY_FIELDS = ['phone', 'email', 'address', 'birthday', 'household'] as const;
export type DirectoryField = (typeof DIRECTORY_FIELDS)[number];

/** Tightest first. */
export const VISIBILITY_LEVELS = ['leaders', 'group', 'church'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

/** Top layer first. */
export const VISIBILITY_SCOPES = ['church', 'group', 'member', 'member_self'] as const;
export type VisibilityScope = (typeof VISIBILITY_SCOPES)[number];

export interface Effective {
  level: VisibilityLevel;
  /** The layer setting the level in effect; 'default' = no church default set. */
  source: VisibilityScope | 'default';
}
