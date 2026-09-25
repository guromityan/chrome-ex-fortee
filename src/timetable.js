/**
 * Reading the fortee timetable DOM.
 *
 * A timetable cell is `.proposal`. Only cells that link to a proposal detail
 * page are real talks; breaks, reception and other slots reuse the same class
 * without a link.
 */

const CELL_SELECTOR = ".proposal";
const DETAIL_LINK_SELECTOR = 'a[href*="/proposal/"]';

/**
 * @typedef {object} ProposalTarget
 * @property {Element} element the hoverable timetable cell
 * @property {string} url the proposal detail URL, as authored in the page
 * @property {string} title the talk title shown in the cell
 */

/**
 * @param {Node | null | undefined} node any node inside a timetable cell
 * @returns {ProposalTarget | null}
 */
export function resolveProposalTarget(node) {
  const element = node instanceof Element ? node.closest(CELL_SELECTOR) : null;
  if (!element) return null;

  const link = element.querySelector(DETAIL_LINK_SELECTOR);
  if (!link) return null;

  return {
    element,
    url: link.getAttribute("href"),
    title: link.textContent.trim(),
  };
}

/**
 * @param {ParentNode} root
 * @returns {ProposalTarget[]}
 */
export function findProposalTargets(root) {
  const seen = new Set();
  const targets = [];

  for (const link of root.querySelectorAll(`${CELL_SELECTOR} ${DETAIL_LINK_SELECTOR}`)) {
    const target = resolveProposalTarget(link);
    if (!target || seen.has(target.element)) continue;
    seen.add(target.element);
    targets.push(target);
  }

  return targets;
}
