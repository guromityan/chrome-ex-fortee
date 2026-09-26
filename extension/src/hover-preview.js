import { setFavorite, syncTimetableFavorite } from "./favorite.js";
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
 * @param {typeof fetch} [deps.fetchImpl] used for the favourite POST
 * @param {number} [deps.openDelayMs] pointer rest time before a fetch starts
 * @param {number} [deps.closeDelayMs] grace period for moving into the panel
 */
export function createHoverPreview({
  root,
  doc,
  fetchProposalHtml,
  fetchImpl = fetch,
  openDelayMs = DEFAULT_OPEN_DELAY_MS,
  closeDelayMs = DEFAULT_CLOSE_DELAY_MS,
}) {
  const view = doc.defaultView;
  const store = createProposalStore({ fetchProposalHtml });

  let openTimer = null;
  let closeTimer = null;
  /** @type {import('./timetable.js').ProposalTarget | null} */
  let pending = null;
  /** @type {import('./timetable.js').ProposalTarget | null} */
  let shown = null;
  /** @type {string | null} */
  let favInFlight = null;

  /** @type {ReturnType<typeof createPanel>} */
  const panel = createPanel({
    doc,
    onFavoriteToggle: ({ detail, url, on }) => {
      void toggleFavorite({ detail, url, on });
    },
  });

  /**
   * @param {{ detail: import('./proposal-page.js').ProposalDetail, url: string, on: boolean }} args
   */
  const toggleFavorite = async ({ detail, url, on }) => {
    if (!detail.uuid || !detail.favApiUrl) return;
    if (favInFlight === detail.uuid) return;
    favInFlight = detail.uuid;

    try {
      const result = await setFavorite({
        apiUrl: detail.favApiUrl,
        uuid: detail.uuid,
        on,
        fetchImpl,
      });

      const previousCount =
        typeof detail.favCount === "number" && !Number.isNaN(detail.favCount)
          ? detail.favCount
          : null;
      const favCount =
        previousCount === null
          ? previousCount
          : Math.max(0, previousCount + (result.on ? 1 : -1));

      await store.patch(url, { favorited: result.on, favCount });
      if (shown?.url === url) {
        panel.applyFavoriteState({ favorited: result.on, favCount });
        place();
      }
      syncTimetableFavorite(doc, result.uuid, result.on);
    } catch (error) {
      const code = /** @type {{ code?: string, message?: string }} */ (error).code;
      const message =
        code === "login_required"
          ? "ログインが必要です"
          : error instanceof Error
            ? error.message
            : "お気に入りの更新に失敗しました";
      if (shown?.url === url) panel.showFavoriteError(message);
    } finally {
      if (favInFlight === detail.uuid) favInFlight = null;
    }
  };

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

  const onEnter = (event) => {
    const target = resolveProposalTarget(event.target);
    if (target) {
      requestOpen(target);
      return;
    }
    if (event.target instanceof Node && panel.element.contains(event.target)) {
      cancelClose();
      return;
    }
    cancelOpen();
  };

  /** True while the pointer only moved within the cell it was already on. */
  const stillInside = (node) =>
    node instanceof Node &&
    Boolean(
      pending?.element.contains(node) ||
        shown?.element.contains(node) ||
        panel.element.contains(node),
    );

  const onLeave = (event) => {
    if (stillInside(event.relatedTarget)) return;
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
      root.addEventListener("mouseover", onEnter, true);
      root.addEventListener("focusin", onEnter, true);
      root.addEventListener("mouseout", onLeave, true);
      root.addEventListener("focusout", onLeave, true);
      doc.addEventListener("keydown", onKeyDown, true);
      view.addEventListener("scroll", place, true);
      view.addEventListener("resize", place);
    },

    stop() {
      if (!running) return;
      running = false;
      close();
      root.removeEventListener("mouseover", onEnter, true);
      root.removeEventListener("focusin", onEnter, true);
      root.removeEventListener("mouseout", onLeave, true);
      root.removeEventListener("focusout", onLeave, true);
      doc.removeEventListener("keydown", onKeyDown, true);
      view.removeEventListener("scroll", place, true);
      view.removeEventListener("resize", place);
      panel.element.remove();
    },
  };
}
