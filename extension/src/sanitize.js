/**
 * Turning proposal markup fetched from fortee into nodes that are safe to
 * insert into the timetable page.
 *
 * Abstracts are author-written Markdown rendered to HTML, so the shape is
 * worth keeping; anything active is not.
 */

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

/** Removed together with their contents, rather than unwrapped. */
const DROPPED_TAGS = new Set([
  "audio",
  "canvas",
  "embed",
  "form",
  "iframe",
  "img",
  "input",
  "link",
  "math",
  "meta",
  "noscript",
  "object",
  "script",
  "style",
  "svg",
  "template",
  "textarea",
  "video",
]);

const isSafeHref = (href) => /^(https?:\/\/|mailto:|\/|#)/i.test(href.trim());

/**
 * @param {string} html untrusted markup
 * @param {Document} doc the document the returned nodes belong to
 * @returns {DocumentFragment}
 */
export function sanitizeRichText(html, doc) {
  const parsed = new DOMParser().parseFromString(html ?? "", "text/html");
  return copyChildren(parsed.body, doc);
}

/**
 * @param {Node} source
 * @param {Document} doc
 * @returns {DocumentFragment}
 */
function copyChildren(source, doc) {
  const fragment = doc.createDocumentFragment();

  for (const node of source.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      fragment.append(doc.createTextNode(node.nodeValue ?? ""));
      continue;
    }
    if (!(node instanceof Element)) continue;

    const tag = node.localName;
    if (DROPPED_TAGS.has(tag)) continue;

    if (!ALLOWED_TAGS.has(tag)) {
      fragment.append(copyChildren(node, doc));
      continue;
    }

    const href = tag === "a" ? (node.getAttribute("href") ?? "") : "";
    if (tag === "a" && !isSafeHref(href)) {
      fragment.append(copyChildren(node, doc));
      continue;
    }

    const element = doc.createElement(tag);
    if (tag === "a") {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer noopener");
    }
    element.append(copyChildren(node, doc));
    fragment.append(element);
  }

  return fragment;
}
