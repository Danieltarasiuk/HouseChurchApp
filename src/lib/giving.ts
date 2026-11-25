/**
 * Online giving through Church Center (Planning Center Giving).
 *
 * The app never handles payments: the Give button opens the church's own
 * Church Center giving page, where PCO Giving processes the gift, sends the
 * receipt and records it against the donor's PCO profile.
 *
 * NEXT_PUBLIC_CHURCH_CENTER_URL is the church's Church Center origin, e.g.
 * https://citychurchmia.churchcenter.com. When it is unset the Give button is
 * hidden everywhere. NEXT_PUBLIC_ variables are inlined at build time, so a
 * change needs a redeploy.
 */

/** Church Center's modal script. It must be loaded from exactly this URL. */
export const CHURCH_CENTER_MODAL_SRC = 'https://js.churchcenter.com/modal/v1';

function churchCenterOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_CHURCH_CENTER_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
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
export const GIVING_URL: string | null = (() => {
  const origin = churchCenterOrigin();
  return origin ? `${origin}/giving?open-in-church-center-modal=true` : null;
})();
