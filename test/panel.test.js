import { beforeEach, describe, expect, test } from "vitest";

import { createPanel } from "../extension/src/panel.js";

const TALK_URL = "/yapc-tokyo-2026/proposal/c38049d1-b9d8-4121-970b-3e9246070e64";

const detail = {
  title: "Do we need (any more) computer languages?",
  status: "採択",
  schedule: "2026/11/28 16:30〜",
  track: "Track B",
  duration: "20分",
  favCount: 4,
  speaker: { name: "Dan Kogai", avatarUrl: "/files/speaker.jpg", twitter: "dankogai" },
  abstractHtml: "<h2>Short answer: no.</h2><ul><li>ケーススタディ</li></ul>",
};

let panel;

beforeEach(() => {
  document.body.innerHTML = "";
  panel = createPanel({ doc: document });
  document.body.append(panel.element);
});

describe("preview panel", () => {
  test("starts hidden", () => {
    expect(panel.isVisible()).toBe(false);
  });

  test("shows the talk title while the detail is still loading", () => {
    panel.renderLoading("Do we need (any more) computer languages?");

    expect(panel.element.textContent).toContain("Do we need (any more) computer languages?");
    expect(panel.element.textContent).toContain("読み込み中");
  });

  test("shows the detail without leaving the timetable", () => {
    panel.renderDetail(detail, TALK_URL);
    const text = panel.element.textContent;

    expect(text).toContain("Do we need (any more) computer languages?");
    expect(text).toContain("Track B");
    expect(text).toContain("2026/11/28 16:30〜");
    expect(text).toContain("20分");
    expect(text).toContain("採択");
    expect(text).toContain("Dan Kogai");
    expect(text).toContain("ケーススタディ");
    expect(text).toContain("お気に入り 4");
  });

  test("links to the full proposal page", () => {
    panel.renderDetail(detail, TALK_URL);

    const link = panel.element.querySelector(`a[href="${TALK_URL}"]`);
    expect(link?.textContent).toContain("forteeで開く");
  });

  test("says so when the talk has no abstract", () => {
    panel.renderDetail({ ...detail, abstractHtml: "" }, TALK_URL);

    expect(panel.element.textContent).toContain("概要は登録されていません");
  });

  test("keeps scripts out of the abstract it renders", () => {
    panel.renderDetail({ ...detail, abstractHtml: "<p>本文</p><script>steal()</script>" }, TALK_URL);

    expect(panel.element.querySelector("script")).toBeNull();
    expect(panel.element.textContent).toContain("本文");
  });

  test("offers a way through when the detail cannot be loaded", () => {
    panel.renderError(TALK_URL);

    expect(panel.element.textContent).toContain("詳細を取得できませんでした");
    expect(panel.element.querySelector(`a[href="${TALK_URL}"]`)).not.toBeNull();
  });

  test("becomes visible once placed beside a cell", () => {
    panel.renderLoading(detail.title);
    panel.showAt({ left: 10, right: 100, top: 20, bottom: 60 });

    expect(panel.isVisible()).toBe(true);
  });

  test("hides again", () => {
    panel.renderDetail(detail, TALK_URL);
    panel.showAt({ left: 10, right: 100, top: 20, bottom: 60 });
    panel.hide();

    expect(panel.isVisible()).toBe(false);
  });
});
