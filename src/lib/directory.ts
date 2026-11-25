import { sql } from '@/lib/db';
import type { Viewer } from '@/lib/authz';

/**
 * Member directory visibility: who may see which contact fields.
 *
 * Levels, tightest first:
 *   leaders  admins, and the pastor of that member's house church
 *   group    also members of the same house church
 *   church   any signed-in member
 *
 * Four layers can each set a level per field: the church default (admins),
 * the member's house church (admins or its pastor), the individual (admins
 * or the member's pastor) and the member's own setting (only the member).
 * A missing setting means "no restriction from this layer", except that with
 * no church default the field is "leaders". The effective level is the
 * tightest across all four, so no layer can loosen another.
 *
 * Always, regardless of levels:
 *   - name, house church, gender and role are visible to every signed-in member
 *   - admins see every field of everyone, with the full date of birth
 *   - a pastor sees every field of their own house church's members, with the
 *     full date of birth; for anyone else they are a regular member
 *   - a member sees all of their own fields
 *   - everyone else never gets the birth year: only month and day
 *   - attendance_note goes only to admins and the member's pastor
 *   - a member with no house church: nobody is in their group, so "group"
 *     behaves as "leaders"
 *
 * redactMember() applies this to a row server-side by deleting the keys the
 * viewer may not see, so hidden fields are absent from responses.
 */

import {
  DIRECTORY_FIELDS, VISIBILITY_LEVELS, VISIBILITY_SCOPES,
  type DirectoryField, type VisibilityLevel, type VisibilityScope, type Effective,
} from '@/lib/directoryTypes';

export { DIRECTORY_FIELDS, VISIBILITY_LEVELS, VISIBILITY_SCOPES };
export type { DirectoryField, VisibilityLevel, VisibilityScope, Effective };

/** Response keys each field controls. */
export const FIELD_KEYS: Record<DirectoryField, string[]> = {
  phone: ['phone'],
  email: ['email'],
  address: ['address_street', 'address_city', 'address_state', 'address_zip', 'latitude', 'longitude'],
  birthday: ['date_of_birth', 'birthday'],
  household: ['pco_household_id', 'household_name'],
};
const LEADER_ONLY_KEYS = ['attendance_note'];

export type LayerSettings = Partial<Record<DirectoryField, VisibilityLevel>>;

export interface VisibilitySettings {
  church: LayerSettings;
  houseChurch: Map<string, LayerSettings>;
  member: Map<string, LayerSettings>;
  memberSelf: Map<string, LayerSettings>;
}

export const emptySettings = (): VisibilitySettings => ({
  church: {}, houseChurch: new Map(), member: new Map(), memberSelf: new Map(),
});

export const isField = (v: unknown): v is DirectoryField => DIRECTORY_FIELDS.includes(v as DirectoryField);
export const isLevel = (v: unknown): v is VisibilityLevel => VISIBILITY_LEVELS.includes(v as VisibilityLevel);
export const isScope = (v: unknown): v is VisibilityScope => VISIBILITY_SCOPES.includes(v as VisibilityScope);

const rank = (l: VisibilityLevel) => VISIBILITY_LEVELS.indexOf(l);

/**
 * Tightest level among the given layers (top layer first; ties go to the
 * upper layer). The church layer, when unset, counts as 'leaders' ('default').
 */
function resolve(layers: [VisibilityScope, VisibilityLevel | undefined][]): Effective | null {
  let best: Effective | null = null;
  for (const [scope, level] of layers) {
    const eff: Effective | null =
      level ? { level, source: scope } : scope === 'church' ? { level: 'leaders', source: 'default' } : null;
    if (eff && (!best || rank(eff.level) < rank(best.level))) best = eff;
  }
  return best;
}

export interface MemberRef {
  id: string;
  house_church_id: string | null;
}

/** All four layers for a member, top first. */
function layersFor(s: VisibilitySettings, field: DirectoryField, m: MemberRef): [VisibilityScope, VisibilityLevel | undefined][] {
  return [
    ['church', s.church[field]],
    ['house_church', m.house_church_id ? s.houseChurch.get(m.house_church_id)?.[field] : undefined],
    ['member', s.member.get(m.id)?.[field]],
    ['member_self', s.memberSelf.get(m.id)?.[field]],
  ];
}

export function effectiveVisibility(s: VisibilitySettings, field: DirectoryField, m: MemberRef): Effective {
  return resolve(layersFor(s, field, m))!; // church layer always yields a value
}

/**
 * For a settings screen at `scope`: the level in effect for its target and
 * the ceiling from the layers above it (options looser than the ceiling can
 * have no effect and are disabled). A house church target has no member
 * layers; the church target has no ceiling.
 */
export function layerView(
  s: VisibilitySettings,
  scope: VisibilityScope,
  field: DirectoryField,
  target: { houseChurchId: string | null; memberId: string | null }
): { value: VisibilityLevel | null; effective: Effective; ceiling: Effective | null } {
  const all: [VisibilityScope, VisibilityLevel | undefined][] = [
    ['church', s.church[field]],
    ['house_church', target.houseChurchId ? s.houseChurch.get(target.houseChurchId)?.[field] : undefined],
    ['member', target.memberId ? s.member.get(target.memberId)?.[field] : undefined],
    ['member_self', target.memberId ? s.memberSelf.get(target.memberId)?.[field] : undefined],
  ];
  const depth = VISIBILITY_SCOPES.indexOf(scope);
  // Layers below the target don't apply to it (e.g. member layers for a house church).
  const relevant = scope === 'church' || scope === 'house_church' ? all.slice(0, depth + 1) : all;
  return {
    value: all[depth][1] ?? null,
    effective: resolve(relevant)!,
    ceiling: depth === 0 ? null : resolve(all.slice(0, depth)),
  };
}

export type Relation = 'self' | 'admin' | 'pastor' | 'group' | 'church';

/** How the viewer relates to a member, for visibility purposes. */
export function relationTo(v: Viewer, m: MemberRef): Relation {
  if (v.memberId && v.memberId === m.id) return 'self';
  if (v.role === 'admin') return 'admin';
  if (v.role === 'house_church_pastor' && m.house_church_id && v.pastoredHcIds.includes(m.house_church_id)) return 'pastor';
  if (v.houseChurchId && m.house_church_id && v.houseChurchId === m.house_church_id) return 'group';
  return 'church';
}

const FULL_ACCESS: Relation[] = ['self', 'admin', 'pastor'];

export function levelAllows(level: VisibilityLevel, rel: Relation): boolean {
  if (FULL_ACCESS.includes(rel)) return true;
  if (rel === 'group') return level === 'group' || level === 'church';
  return level === 'church';
}

const toIsoDate = (v: unknown): string | null => {
  if (!v) return null;
  // DATE columns arrive as UTC-midnight Dates (as the existing routes assume).
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

/** Age in whole years on `today` (YYYY-MM-DD strings). */
export function ageOn(dob: string, today: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}

/**
 * Removes every key of `row` the viewer may not see. `row` must include `id`
 * and `house_church_id`; only keys present are considered, so routes with
 * different column sets can share this.
 *
 * Birthday: full date (`date_of_birth`, YYYY-MM-DD) only for self, admins and
 * the member's pastor. Anyone else allowed to see it gets `birthday` (MM-DD)
 * and no `date_of_birth`. `is_minor` is added whenever the row had a date of
 * birth, so lists can keep hiding minors by default without exposing ages.
 */
export function redactMember<T extends Record<string, unknown> & MemberRef>(
  viewer: Viewer,
  row: T,
  settings: VisibilitySettings,
  today: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  const rel = relationTo(viewer, row);
  const hadDob = 'date_of_birth' in row;
  const dob = toIsoDate(row.date_of_birth);

  if (hadDob) {
    out.is_minor = dob ? ageOn(dob, today) < 18 : false;
    out.date_of_birth = dob;
    out.birthday = dob ? dob.slice(5) : null;
  }

  for (const field of DIRECTORY_FIELDS) {
    if (!levelAllows(effectiveVisibility(settings, field, row).level, rel)) {
      for (const key of FIELD_KEYS[field]) delete out[key];
    }
  }
  if (!FULL_ACCESS.includes(rel)) delete out.date_of_birth; // never the year
  if (rel !== 'admin' && rel !== 'pastor') for (const key of LEADER_ONLY_KEYS) delete out[key];

  return out;
}

/** Every visibility setting (the table holds at most a few rows per member). */
export async function loadVisibilitySettings(): Promise<VisibilitySettings> {
  const rows = await sql('SELECT scope, scope_id::text AS scope_id, field, level FROM directory_visibility');
  const s = emptySettings();
  for (const r of rows) {
    if (!isField(r.field) || !isLevel(r.level)) continue;
    const put = (map: Map<string, LayerSettings>) => {
      if (!r.scope_id) return;
      const layer = map.get(r.scope_id) ?? {};
      layer[r.field as DirectoryField] = r.level as VisibilityLevel;
      map.set(r.scope_id, layer);
    };
    if (r.scope === 'church') s.church[r.field as DirectoryField] = r.level as VisibilityLevel;
    else if (r.scope === 'house_church') put(s.houseChurch);
    else if (r.scope === 'member') put(s.member);
    else if (r.scope === 'member_self') put(s.memberSelf);
  }
  return s;
}
