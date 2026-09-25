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
  fav: (count) => `お気に入り ${count}`,
};

/**
 * @param {{ doc: Document }} deps
 */
export function createPanel({ doc }) {
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

  const replaceBody = (...children) => {
    body.replaceChildren(...children);
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

  return {
    element,

    /** @param {string} title the title already visible in the timetable cell */
    renderLoading(title) {
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
      const children = [];

      const meta = make("div", "fhp-panel__meta");
      if (detail.status) meta.append(make("span", "fhp-panel__badge", detail.status));
      for (const value of [detail.track, detail.schedule, detail.duration]) {
        if (value) meta.append(make("span", "fhp-panel__meta-item", value));
      }
      if (meta.childElementCount > 0) children.push(meta);

      children.push(make("h3", "fhp-panel__title", detail.title));

      const { name, avatarUrl, twitter } = detail.speaker;
      if (name || avatarUrl || twitter) {
        const speaker = make("div", "fhp-panel__speaker");
        if (avatarUrl) {
          const avatar = make("img", "fhp-panel__avatar");
          avatar.src = avatarUrl;
          avatar.alt = "";
          speaker.append(avatar);
        }
        if (name) speaker.append(make("span", "fhp-panel__speaker-name", name));
        if (twitter) {
          const handle = make("a", "fhp-panel__speaker-handle", `@${twitter}`);
          handle.href = `https://twitter.com/${twitter}`;
          handle.target = "_blank";
          handle.rel = "noreferrer noopener";
          speaker.append(handle);
        }
        children.push(speaker);
      }

      if (typeof detail.favCount === "number" && !Number.isNaN(detail.favCount)) {
        children.push(make("div", "fhp-panel__fav", TEXT.fav(detail.favCount)));
      }

      const abstract = make("div", "fhp-panel__abstract");
      if (detail.abstractHtml) {
        abstract.append(sanitizeRichText(detail.abstractHtml, doc));
      }
      if (abstract.textContent.trim() === "") {
        abstract.replaceChildren(make("p", "fhp-panel__empty", TEXT.emptyAbstract));
      }
      children.push(abstract, footerLink(url));

      replaceBody(...children);
    },

    /** @param {string} url */
    renderError(url) {
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
