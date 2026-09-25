import { afterEach, describe, expect, test } from "vitest";

import { start } from "../extension/src/main.js";
import { loadFixture } from "./fixtures.js";

let running;

afterEach(() => {
  running?.stop();
  running = null;
  document.body.innerHTML = "";
});

describe("start", () => {
  test("marks the talks in the timetable as previewable", () => {
    document.body.innerHTML = loadFixture("timetable-day1.html").querySelector("#timetable").outerHTML;

    running = start({ doc: document });

    expect(document.querySelectorAll(".fhp-previewable")).toHaveLength(28);
    expect(document.querySelector(".fhp-panel")).not.toBeNull();
  });

  test("does nothing on a page without a timetable", () => {
    document.body.innerHTML = "<main><h1>トーク</h1></main>";

    running = start({ doc: document });

    expect(running).toBeNull();
    expect(document.querySelector(".fhp-panel")).toBeNull();
  });
});
