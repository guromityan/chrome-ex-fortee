import { createPanel } from "./panel.js";
import { createProposalStore } from "./proposal-store.js";
import { resolveProposalTarget } from "./timetable.js";

/**
 * Hovering a timetable cell opens that talk's detail in a floating panel.
 *
 * Listeners are delegated from `root`, so cells fortee re-renders (favourites,
 * tags) keep working without re-registration.
 */

const DEFAULT_OPEN_DELAY_MS = 150;
const DEFAULT_CLOSE_DELAY_MS = 200;

/**
 * @param {object} deps
 * @param {Element} deps.root the element containing the timetable
 * @param {Document} deps.doc
 * @param {(url: string) => Promise<string>} deps.fetchProposalHtml
 * @param {number} [deps.openDelayMs] pointer rest time before a fetch starts
 * @param {number} [deps.closeDelayMs] grace period for moving into the panel
 */
export function createHoverPreview({
  root,
  doc,
  fetchProposalHtml,
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}) {
  const view = doc.defaultView;
  const panel = createPanel({ doc });
  const store = createProposalStore({ fetchProposalHtml });

  let openTimer = null;
  let closeTimer = null;
  /** @type {import('./timetable.js').ProposalTarget | null} */
  let pending = null;
  /** @type {import('./timetable.js').ProposalTarget | null} */
  let shown = null;

  const place = () => {
    if (shown) panel.showAt(shown.element.getBoundingClientRect());
  };

  const cancelOpen = () => {
    if (openTimer !== null) view.clearTimeout(openTimer);
    openTimer = null;
    pending = null;
  };

  const cancelClose = () => {
    if (closeTimer !== null) view.clearTimeout(closeTimer);
    closeTimer = null;
  };

  const close = () => {
    cancelOpen();
    cancelClose();
    shown = null;
    panel.hide();
  };

  const open = (target) => {
    openTimer = null;
    pending = null;
    shown = target;

    panel.renderLoading(target.title);
    place();

    store
      .load(target.url)
      .then((detail) => {
        if (shown?.url !== target.url) return;
        panel.renderDetail(detail, target.url);
        place();
      })
      .catch(() => {
        if (shown?.url !== target.url) return;
        panel.renderError(target.url);
        place();
      });
  };

  const requestOpen = (target) => {
    cancelClose();
    if (shown?.element === target.element || pending?.element === target.element) return;
    cancelOpen();
    pending = target;
    openTimer = view.setTimeout(() => open(target), openDelayMs);
  };

  const onPointerEnter = (event) => {
    const target = resolveProposalTarget(event.target);
    if (target) {
      requestOpen(target);
      return;
    }
    if (event.target instanceof Element && event.target.closest(".fhp-panel")) {
      cancelClose();
      return;
    }
    cancelOpen();
  };

  const onPointerLeave = () => {
    cancelOpen();
    if (!panel.isVisible()) return;
    cancelClose();
    closeTimer = view.setTimeout(close, closeDelayMs);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") close();
  };

  let running = false;

  return {
    start() {
      if (running) return;
      running = true;
      doc.body.append(panel.element);
      root.addEventListener("mouseover", onPointerEnter, true);
      root.addEventListener("focusin", onPointerEnter, true);
      root.addEventListener("mouseout", onPointerLeave, true);
      root.addEventListener("focusout", onPointerLeave, true);
      doc.addEventListener("keydown", onKeyDown, true);
      view.addEventListener("scroll", place, true);
      view.addEventListener("resize", place);
    },

    stop() {
      if (!running) return;
      running = false;
      close();
      root.removeEventListener("mouseover", onPointerEnter, true);
      root.removeEventListener("focusin", onPointerEnter, true);
      root.removeEventListener("mouseout", onPointerLeave, true);
      root.removeEventListener("focusout", onPointerLeave, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      view.removeEventListener("scroll", place, true);
      view.removeEventListener("resize", place);
      panel.element.remove();
    },
  };
}
