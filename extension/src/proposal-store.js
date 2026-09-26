import { parseProposalDetail } from "./proposal-page.js";

/**
 * Proposal details, fetched once per talk.
 *
 * Hovering the same cell repeatedly is the normal way to read a timetable, so
 * a resolved detail is kept forever and a failure is forgotten immediately.
 */

/**
 * @param {{ fetchProposalHtml: (url: string) => Promise<string> }} deps
 */
export function createProposalStore({ fetchProposalHtml }) {
  /** @type {Map<string, Promise<import('./proposal-page.js').ProposalDetail>>} */
  const byUrl = new Map();

  return {
    /**
     * @param {string} url
     * @returns {Promise<import('./proposal-page.js').ProposalDetail>}
     */
    load(url) {
      const pending = byUrl.get(url);
      if (pending) return pending;

      const loading = fetchProposalHtml(url).then((html) => {
        const detail = parseProposalDetail(html);
        if (!detail) throw new Error(`Not a fortee proposal page: ${url}`);
        return detail;
      });

      loading.catch(() => byUrl.delete(url));
      byUrl.set(url, loading);
      return loading;
    },
  };
}
