import { placePanel } from "./position.js";
import { sanitizeRichText } from "./sanitize.js";

/**
 * The floating panel that shows a proposal without leaving the timetable.
 *
 * Wording is Japanese, matching fortee.
 */

const TEXT = {
  loading: "読み込み中…",
  emptyAbstract: "概要は登録されていません",
  error: "詳細を取得できませんでした",
  errorHint: "もう一度カーソルを合わせると再試行します。",
  openInFortee: "forteeで開く",
  fav: "お気に入り",
  favBusy: "更新中…",
  loginRequired: "ログインが必要です",
  loginAction: "ログインする",
  loginHint: "forteeにログインするとお気に入りに追加できます。",
};

/**
 * @param {object} deps
 * @param {Document} deps.doc
 * @param {(args: { detail: import('./proposal-page.js').ProposalDetail, url: string, on: boolean }) => void} [deps.onFavoriteToggle]
 */
export function createPanel({ doc, onFavoriteToggle }) {
  const make = (tag, className, textContent) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (textContent != null) node.textContent = textContent;
    return node;
  };

  const element = make("div", "fhp-panel");
  element.setAttribute("role", "tooltip");
  element.hidden = true;

  const body = make("div", "fhp-panel__body");
  element.append(body);

  /** @type {import('./proposal-page.js').ProposalDetail | null} */
  let currentDetail = null;
  /** @type {string | null} */
  let currentUrl = null;
  /** @type {HTMLButtonElement | null} */
  let favButton = null;
  /** @type {HTMLElement | null} */
  let favMessage = null;

  const replaceBody = (...children) => {
    body.replaceChildren(...children);
  };

  /** @param {import('./proposal-page.js').ProposalDetail} detail */
  const metaRow = (detail) => {
    const row = make("div", "fhp-panel__meta");
    if (detail.status) row.append(make("span", "fhp-panel__badge", detail.status));
    for (const value of [detail.track, detail.schedule, detail.duration]) {
      if (value) row.append(make("span", "fhp-panel__meta-item", value));
    }
    return row.childElementCount > 0 ? row : null;
  };

  /** @param {import('./proposal-page.js').ProposalDetail['speaker']} speaker */
  const speakerRow = ({ name, avatarUrl, twitter }) => {
    if (!name && !avatarUrl && !twitter) return null;

    const row = make("div", "fhp-panel__speaker");
    if (avatarUrl) {
      const avatar = make("img", "fhp-panel__avatar");
      avatar.src = avatarUrl;
      avatar.alt = "";
      row.append(avatar);
    }
    if (name) row.append(make("span", "fhp-panel__speaker-name", name));
    if (twitter) {
      const handle = make("a", "fhp-panel__speaker-handle", `@${twitter}`);
      handle.href = `https://twitter.com/${twitter}`;
      handle.target = "_blank";
      handle.rel = "noreferrer noopener";
      row.append(handle);
    }
    return row;
  };

  /** @param {string} abstractHtml */
  const abstractBlock = (abstractHtml) => {
    const block = make("div", "fhp-panel__abstract");
    if (abstractHtml) block.append(sanitizeRichText(abstractHtml, doc));
    if (block.textContent.trim() === "") {
      block.replaceChildren(make("p", "fhp-panel__empty", TEXT.emptyAbstract));
    }
    return block;
  };

  const footerLink = (url) => {
    const footer = make("div", "fhp-panel__footer");
    const link = make("a", "fhp-panel__link", TEXT.openInFortee);
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    footer.append(link);
    return footer;
  };

  const loginHref = (url) => {
    const path = url.startsWith("http") ? new URL(url).pathname : url;
    return `/login?redirect=${encodeURIComponent(path)}`;
  };

  const clearFavMessage = () => {
    favMessage?.remove();
    favMessage = null;
  };

  const showFavMessage = (message, { loginUrl } = /** @type {{ loginUrl?: string }} */ ({})) => {
    clearFavMessage();
    const box = make("div", "fhp-panel__fav-msg");
    box.append(make("p", "fhp-panel__fav-msg-text", message));
    if (loginUrl) {
      const link = make("a", "fhp-panel__link", TEXT.loginAction);
      link.href = loginUrl;
      link.target = "_blank";
      link.rel = "noreferrer noopener";
      box.append(link);
      box.append(make("p", "fhp-panel__status", TEXT.loginHint));
    }
    favButton?.after(box);
    favMessage = box;
  };

  /**
   * @param {import('./proposal-page.js').ProposalDetail} detail
   * @param {string} url
   */
  const favControl = (detail, url) => {
    const canToggle = Boolean(detail.uuid && detail.favApiUrl);
    if (!canToggle && typeof detail.favCount !== "number") return null;

    const button = /** @type {HTMLButtonElement} */ (make("button", "fhp-panel__fav"));
    button.type = "button";
    const star = make("span", "fhp-panel__fav-star", "★");
    star.setAttribute("aria-hidden", "true");
    const label = make("span", "fhp-panel__fav-label", TEXT.fav);
    const count = make("span", "fhp-panel__fav-count");
    button.append(star, label, count);
    favButton = button;

    const paint = () => {
      const on = Boolean(detail.favorited);
      button.classList.toggle("fhp-panel__fav--on", on);
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.setAttribute("aria-label", on ? "お気に入りを解除" : "お気に入りに追加");
      count.textContent =
        typeof detail.favCount === "number" && !Number.isNaN(detail.favCount)
          ? String(detail.favCount)
          : "";
      button.disabled = false;
    };

    paint();

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearFavMessage();

      if (!detail.loggedIn) {
        showFavMessage(TEXT.loginRequired, { loginUrl: loginHref(url) });
        return;
      }

      if (!detail.uuid || !detail.favApiUrl || !onFavoriteToggle) return;

      button.disabled = true;
      label.textContent = TEXT.favBusy;
      onFavoriteToggle({ detail, url, on: !detail.favorited });
    });

    return button;
  };

  return {
    element,

    /** @param {string} title the title already visible in the timetable cell */
    renderLoading(title) {
      currentDetail = null;
      currentUrl = null;
      favButton = null;
      favMessage = null;
      const heading = make("h3", "fhp-panel__title", title);
      const status = make("p", "fhp-panel__status", TEXT.loading);
      status.setAttribute("role", "status");
      replaceBody(heading, status);
    },

    /**
     * @param {import('./proposal-page.js').ProposalDetail} detail
     * @param {string} url
     */
    renderDetail(detail, url) {
      currentDetail = detail;
      currentUrl = url;
      favMessage = null;

      replaceBody(
        ...[
          metaRow(detail),
          make("h3", "fhp-panel__title", detail.title),
          speakerRow(detail.speaker),
          favControl(detail, url),
          abstractBlock(detail.abstractHtml),
          footerLink(url),
        ].filter((node) => node !== null),
      );
    },

    /**
     * @param {{ favorited: boolean, favCount: number | null }} state
     */
    applyFavoriteState({ favorited, favCount }) {
      if (!currentDetail || !favButton) return;
      currentDetail = { ...currentDetail, favorited, favCount };
      favButton.classList.toggle("fhp-panel__fav--on", favorited);
      favButton.setAttribute("aria-pressed", favorited ? "true" : "false");
      favButton.setAttribute("aria-label", favorited ? "お気に入りを解除" : "お気に入りに追加");
      const count = favButton.querySelector(".fhp-panel__fav-count");
      if (count) {
        count.textContent =
          typeof favCount === "number" && !Number.isNaN(favCount) ? String(favCount) : "";
      }
      const label = favButton.querySelector(".fhp-panel__fav-label");
      if (label) label.textContent = TEXT.fav;
      favButton.disabled = false;
      clearFavMessage();
    },

    /** @param {string} message */
    showFavoriteError(message) {
      if (!favButton || !currentDetail) return;
      const label = favButton.querySelector(".fhp-panel__fav-label");
      if (label) label.textContent = TEXT.fav;
      favButton.disabled = false;
      showFavMessage(message, {
        loginUrl: message.includes("ログイン") && currentUrl ? loginHref(currentUrl) : undefined,
      });
    },

    /** @param {string} url */
    renderError(url) {
      currentDetail = null;
      currentUrl = url;
      favButton = null;
      favMessage = null;
      replaceBody(
        make("p", "fhp-panel__error", TEXT.error),
        make("p", "fhp-panel__status", TEXT.errorHint),
        footerLink(url),
      );
    },

    /** @param {{ left: number, right: number, top: number, bottom: number }} anchor */
    showAt(anchor) {
      const view = doc.defaultView;
      element.hidden = false;
      element.style.visibility = "hidden";

      const { left, top } = placePanel({
        anchor,
        panel: { width: element.offsetWidth, height: element.offsetHeight },
        viewport: { width: view.innerWidth, height: view.innerHeight },
      });

      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.visibility = "visible";
    },

    hide() {
      element.hidden = true;
    },

    isVisible() {
      return !element.hidden;
    },
  };
}
