/**
 * Where the preview panel goes relative to the hovered timetable cell.
 *
 * Coordinates are viewport-relative, matching `position: fixed`.
 */

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/**
 * @param {object} args
 * @param {{ left: number, right: number, top: number, bottom: number }} args.anchor hovered cell
 * @param {{ width: number, height: number }} args.panel
 * @param {{ width: number, height: number }} args.viewport
 * @param {number} [args.gap] space between cell and panel
 * @param {number} [args.margin] smallest distance kept from the viewport edges
 * @returns {{ left: number, top: number }}
 */
export function placePanel({ anchor, panel, viewport, gap = 12, margin = 8 }) {
  const rightmost = viewport.width - margin - panel.width;
  const beside = anchor.right + gap;
  const before = anchor.left - gap - panel.width;

  const left =
    beside <= rightmost
      ? beside
      : before >= margin
        ? before
        : clamp(beside, margin, Math.max(margin, rightmost));

  const lowest = viewport.height - margin - panel.height;

  return { left, top: Math.max(margin, Math.min(anchor.top, lowest)) };
}
