import { describe, expect, test } from "vitest";

import { sanitizeRichText } from "../src/sanitize.js";

const sanitizedHtml = (html) => {
  const host = document.createElement("div");
  host.append(sanitizeRichText(html, document));
  return host.innerHTML;
};

describe("sanitizeRichText", () => {
  test("keeps the structure fortee abstracts use", () => {
    const html = "<h2>まとめ</h2><ul><li><strong>Perl</strong> と <em>Raku</em></li></ul>";

    expect(sanitizedHtml(html)).toBe(html);
  });

  test("drops scripts and event handlers", () => {
    const html = '<p onclick="steal()">本文</p><script>steal()</script><iframe src="/x"></iframe>';

    expect(sanitizedHtml(html)).toBe("<p>本文</p>");
  });

  test("keeps http links but opens them in a new tab", () => {
    const html = '<p><a href="https://example.com/talk">資料</a></p>';

    expect(sanitizedHtml(html)).toBe(
      '<p><a href="https://example.com/talk" target="_blank" rel="noreferrer noopener">資料</a></p>',
    );
  });

  test("unwraps links with a non-http scheme, keeping their text", () => {
    const html = '<p><a href="javascript:steal()">押して</a></p>';

    expect(sanitizedHtml(html)).toBe("<p>押して</p>");
  });

  test("keeps images out of the preview", () => {
    const html = '<p>図: <img src="https://example.com/a.png" alt="図"></p>';

    expect(sanitizedHtml(html)).toBe("<p>図: </p>");
  });
});
