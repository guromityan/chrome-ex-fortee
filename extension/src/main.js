import { createHoverPreview } from "./hover-preview.js";
import { findProposalTargets } from "./timetable.js";

/**
 * Entry point: wires the hover preview to the live fortee timetable page.
 */

const PREVIEWABLE_CLASS = "fhp-previewable";

/**
 * Proposal pages are same-origin, so the session cookie travels with the
 * request and a logged-in visitor sees their own favourite state.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchProposalHtml(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`fortee responded with ${response.status} for ${url}`);
  return response.text();
}

/**
 * @param {{ doc?: Document }} [options]
 * @returns {{ stop: () => void } | null} null when the page has no timetable
 */
export function start({ doc = document } = {}) {
  if (!doc.getElementById("timetable")) return null;

  for (const { element } of findProposalTargets(doc)) {
    element.classList.add(PREVIEWABLE_CLASS);
  }

  const preview = createHoverPreview({ root: doc.body, doc, fetchProposalHtml });
  preview.start();
  return preview;
}
