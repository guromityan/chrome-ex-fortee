import { describe, expect, test } from "vitest";

import { findProposalTargets, resolveProposalTarget } from "../extension/src/timetable.js";
import { loadFixture } from "./fixtures.js";

describe("findProposalTargets", () => {
  test("finds every talk in the Day 1 timetable", () => {
    const targets = findProposalTargets(loadFixture("timetable-day1.html"));

    expect(targets).toHaveLength(28);
  });

  test("exposes the talk's detail URL and title", () => {
    const targets = findProposalTargets(loadFixture("timetable-day1.html"));

    expect(targets).toContainEqual(
      expect.objectContaining({
        url: "/yapc-tokyo-2026/proposal/c38049d1-b9d8-4121-970b-3e9246070e64",
        title: "Do we need (any more) computer languages?",
      }),
    );
  });

  test("ignores non-talk slots such as breaks and reception", () => {
    const targets = findProposalTargets(loadFixture("timetable-preparty.html"));

    expect(targets).toEqual([]);
  });
});

describe("resolveProposalTarget", () => {
  test("resolves a talk from any node inside its timetable cell", () => {
    const doc = loadFixture("timetable-day1.html");
    const speakerName = doc.querySelector(
      '.proposal:has(a[href$="c38049d1-b9d8-4121-970b-3e9246070e64"]) .speaker-name',
    );

    const target = resolveProposalTarget(speakerName);

    expect(target).toMatchObject({
      url: "/yapc-tokyo-2026/proposal/c38049d1-b9d8-4121-970b-3e9246070e64",
      title: "Do we need (any more) computer languages?",
    });
  });

  test("returns null for a slot without a talk", () => {
    const doc = loadFixture("timetable-preparty.html");
    const breakSlot = doc.querySelector(".proposal.time-slot");

    expect(resolveProposalTarget(breakSlot)).toBeNull();
  });

  test("returns null outside the timetable", () => {
    const doc = loadFixture("timetable-day1.html");

    expect(resolveProposalTarget(doc.querySelector("h1"))).toBeNull();
  });
});
