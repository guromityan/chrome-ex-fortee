import { describe, expect, test } from "vitest";

import { placePanel } from "../src/position.js";

const viewport = { width: 1000, height: 600 };
const panel = { width: 360, height: 400 };

describe("placePanel", () => {
  test("sits to the right of the hovered cell", () => {
    const anchor = { left: 100, right: 300, top: 120, bottom: 240 };

    expect(placePanel({ anchor, panel, viewport, gap: 12 })).toEqual({ left: 312, top: 120 });
  });

  test("flips to the left when the right edge has no room", () => {
    const anchor = { left: 700, right: 900, top: 120, bottom: 240 };

    expect(placePanel({ anchor, panel, viewport, gap: 12 })).toEqual({ left: 328, top: 120 });
  });

  test("stays inside the viewport when neither side fits", () => {
    const anchor = { left: 20, right: 980, top: 120, bottom: 240 };

    expect(placePanel({ anchor, panel, viewport, gap: 12, margin: 8 })).toEqual({
      left: 632,
      top: 120,
    });
  });

  test("lifts a tall panel so its bottom stays visible", () => {
    const anchor = { left: 100, right: 300, top: 400, bottom: 520 };

    expect(placePanel({ anchor, panel, viewport, gap: 12, margin: 8 })).toEqual({
      left: 312,
      top: 192,
    });
  });

  test("never pushes the panel above the top edge", () => {
    const anchor = { left: 100, right: 300, top: 10, bottom: 40 };
    const tallPanel = { width: 360, height: 900 };

    expect(placePanel({ anchor, panel: tallPanel, viewport, gap: 12, margin: 8 })).toEqual({
      left: 312,
      top: 8,
    });
  });
});
