/**
 * Online giving through Church Center (Planning Center Giving).
 *
 * The app never handles payments: the Give button opens the church's own
 * Church Center giving page, where PCO Giving processes the gift, sends the
 * receipt and records it against the donor's PCO profile.
 *
 * churches.church_center_url is the church's Church Center origin, e.g.
 * https://citychurchmia.churchcenter.com (Settings → Church). When it is
 * empty the Give button is hidden everywhere.
 */

/** Church Center's modal script. It must be loaded from exactly this URL. */
export const CHURCH_CENTER_MODAL_SRC = 'https://js.churchcenter.com/modal/v1';

/** The https origin of a Church Center URL, or null if it is not one. */
export function churchCenterOrigin(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/**
 * The giving page URL, or null when giving is not configured.
 *
 * The `open-in-church-center-modal=true` parameter is what the modal script
 * looks for: on a desktop HTTPS page it opens giving in an overlay; on a phone,
 * over plain HTTP, or if the script never loaded, the link simply opens the
 * page in a new tab (target="_blank"), where Church Center can hand off to its
 * app if installed.
 */
export function givingUrlFor(churchCenterUrl: string | null | undefined): string | null {
  const origin = churchCenterOrigin(churchCenterUrl);
  return origin ? `${origin}/giving?open-in-church-center-modal=true` : null;
}
