/**
 * Reading a fortee proposal detail page (`/<event>/proposal/<uuid>`).
 */

const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() || null : null);

/**
 * @typedef {object} ProposalDetail
 * @property {string} title
 * @property {string | null} status e.g. 採択
 * @property {string | null} schedule e.g. 2026/11/28 16:30〜
 * @property {string | null} track e.g. Track B
 * @property {string | null} duration e.g. 20分
 * @property {number | null} favCount
 * @property {string | null} favApiUrl e.g. /yapc-tokyo-2026/proposal/fav
 * @property {string | null} uuid proposal id used by the fav API
 * @property {boolean} loggedIn whether the visitor is signed in to fortee
 * @property {boolean} favorited whether this visitor already favourited the talk
 * @property {{ name: string | null, avatarUrl: string | null, twitter: string | null }} speaker
 * @property {string} abstractHtml untrusted markup; sanitize before inserting
 */

/**
 * @param {string} html a proposal detail page response body
 * @returns {ProposalDetail | null} null when the response is not a proposal page
 */
export function parseProposalDetail(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector(".proposal-detail");
  if (!root) return null;

  const title = text(root.querySelector("h2"));
  if (!title) return null;

  const speakerBlock = root.querySelector(".speaker");
  const avatar = speakerBlock?.querySelector("img");
  const fav = root.querySelector(".status-bar .fav.proposal-fav, .status-bar .proposal-fav");
  const favCount = text(fav?.querySelector(".count"));

  return {
    title,
    status: text(root.querySelector(".type .badge")),
    schedule: text(root.querySelector(".type .schedule")),
    track: text(root.querySelector(".type .track")),
    duration: text(root.querySelector(".type .name")),
    favCount: favCount === null ? null : Number.parseInt(favCount, 10),
    favApiUrl: root.getAttribute("data-fav-api") || null,
    uuid: fav?.getAttribute("data-uuid") || null,
    loggedIn: fav?.getAttribute("data-logged-in") === "true",
    favorited: Boolean(fav?.classList.contains("active")),
    speaker: {
      name: text(speakerBlock?.querySelector("span")),
      avatarUrl: avatar?.getAttribute("src") || null,
      twitter: text(speakerBlock?.querySelector('a[href*="twitter.com"], a[href*="x.com"]')),
    },
    abstractHtml: root.querySelector(".abstract .md")?.innerHTML.trim() ?? "",
  };
}
