import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createHoverPreview } from "../src/hover-preview.js";
import { loadFixture, readFixture } from "./fixtures.js";

const OPEN_DELAY = 120;
const CLOSE_DELAY = 200;

const TALK = {
  title: "Do we need (any more) computer languages?",
  url: "/yapc-tokyo-2026/proposal/c38049d1-b9d8-4121-970b-3e9246070e64",
};
const OTHER_TALK = {
  title: "Railsプロダクトのテストコードを変えずにCIを高速化する",
  url: "/yapc-tokyo-2026/proposal/2e04a682-18eb-4942-8f16-4066a41e3464",
};

/** @returns {Element} the timetable cell whose detail page is `url` */
const cellOf = (url) => document.querySelector(`.proposal:has(a[href$="${url.split("/").pop()}"])`);

const hover = (node) => node.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
const unhover = (node) => node.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));

const panelText = () => document.querySelector(".fhp-panel")?.textContent ?? "";
const panelIsVisible = () => {
  const panel = /** @type {HTMLElement | null} */ (document.querySelector(".fhp-panel"));
  return Boolean(panel) && !panel.hidden;
};

let preview;
let requested;

const startPreview = (respond) => {
  requested = [];
  preview = createHoverPreview({
    root: document.body,
    doc: document,
    openDelayMs: OPEN_DELAY,
    closeDelayMs: CLOSE_DELAY,
    fetchProposalHtml: async (url) => {
      requested.push(url);
      return respond ? respond(url) : readFixture("proposal-detail.html");
    },
  });
  preview.start();
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = loadFixture("timetable-day1.html").querySelector("#timetable").outerHTML;
});

afterEach(() => {
  preview?.stop();
  vi.useRealTimers();
});

describe("hover preview", () => {
  test("shows the talk's detail while the pointer rests on its cell", async () => {
    let answer = () => {};
    startPreview(
      () =>
        new Promise((resolve) => {
          answer = () => resolve(readFixture("proposal-detail.html"));
        }),
    );

    hover(cellOf(TALK.url).querySelector(".speaker-name"));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);

    expect(panelText()).toContain(TALK.title);
    expect(panelText()).toContain("読み込み中");

    answer();
    await vi.advanceTimersByTimeAsync(0);

    expect(panelText()).toContain("Track B");
    expect(panelText()).toContain("Dan Kogai");
  });

  test("leaves breaks and other non-talk slots alone", async () => {
    startPreview();

    hover(document.querySelector(".proposal.time-slot"));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY * 2);

    expect(panelIsVisible()).toBe(false);
    expect(requested).toEqual([]);
  });

  test("does not fetch anything for a pointer passing over a cell", async () => {
    startPreview();
    const cell = cellOf(TALK.url);

    hover(cell);
    await vi.advanceTimersByTimeAsync(OPEN_DELAY - 20);
    unhover(cell);
    await vi.advanceTimersByTimeAsync(OPEN_DELAY * 2);

    expect(requested).toEqual([]);
    expect(panelIsVisible()).toBe(false);
  });

  test("hides the panel shortly after the pointer leaves", async () => {
    startPreview();
    const cell = cellOf(TALK.url);

    hover(cell);
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);
    unhover(cell);
    await vi.advanceTimersByTimeAsync(CLOSE_DELAY);

    expect(panelIsVisible()).toBe(false);
  });

  test("stays open while the pointer is inside the panel", async () => {
    startPreview();
    const cell = cellOf(TALK.url);

    hover(cell);
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);
    unhover(cell);
    hover(document.querySelector(".fhp-panel a"));
    await vi.advanceTimersByTimeAsync(CLOSE_DELAY * 2);

    expect(panelIsVisible()).toBe(true);
  });

  test("swaps to the talk the pointer moves on to", async () => {
    startPreview((url) =>
      url === OTHER_TALK.url ? new Promise(() => {}) : readFixture("proposal-detail.html"),
    );

    hover(cellOf(TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);
    expect(panelText()).toContain("Dan Kogai");

    hover(cellOf(OTHER_TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);

    expect(panelText()).toContain(OTHER_TALK.title);
    expect(panelText()).not.toContain("Dan Kogai");
    expect(requested).toEqual([TALK.url, OTHER_TALK.url]);
  });

  test("says the detail could not be loaded when fortee does not answer", async () => {
    startPreview(() => {
      throw new Error("offline");
    });

    hover(cellOf(TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);

    expect(panelText()).toContain("詳細を取得できませんでした");
  });

  test("closes on Escape", async () => {
    startPreview();

    hover(cellOf(TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(panelIsVisible()).toBe(false);
  });

  test("opens for keyboard users who focus a talk link", async () => {
    startPreview();

    cellOf(TALK.url)
      .querySelector("a")
      .dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);

    expect(panelText()).toContain(TALK.title);
  });

  test("takes its panel away when stopped", async () => {
    startPreview();

    hover(cellOf(TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY);
    preview.stop();

    expect(document.querySelector(".fhp-panel")).toBeNull();

    hover(cellOf(TALK.url));
    await vi.advanceTimersByTimeAsync(OPEN_DELAY * 2);

    expect(document.querySelector(".fhp-panel")).toBeNull();
  });
});
