import { describe, expect, test } from "vitest";

import { createProposalStore } from "../extension/src/proposal-store.js";
import { readFixture } from "./fixtures.js";

const TALK_URL = "/yapc-tokyo-2026/proposal/c38049d1-b9d8-4121-970b-3e9246070e64";

/** Stands in for the network: records requests, replies from a script of responses. */
const fakeFortee = (responses) => {
  const requested = [];
  return {
    requested,
    fetchProposalHtml: async (url) => {
      requested.push(url);
      const next = responses.shift() ?? { html: readFixture("proposal-detail.html") };
      if (next.error) throw new Error(next.error);
      return next.html;
    },
  };
};

describe("proposal store", () => {
  test("loads the detail of a talk", async () => {
    const store = createProposalStore(fakeFortee([]));

    await expect(store.load(TALK_URL)).resolves.toMatchObject({
      title: "Do we need (any more) computer languages?",
      track: "Track B",
    });
  });

  test("serves a second look at the same talk without asking fortee again", async () => {
    const fortee = fakeFortee([]);
    const store = createProposalStore(fortee);

    await store.load(TALK_URL);
    await store.load(TALK_URL);

    expect(fortee.requested).toEqual([TALK_URL]);
  });

  test("shares one request between overlapping hovers", async () => {
    const fortee = fakeFortee([]);
    const store = createProposalStore(fortee);

    const [first, second] = await Promise.all([store.load(TALK_URL), store.load(TALK_URL)]);

    expect(fortee.requested).toEqual([TALK_URL]);
    expect(first).toBe(second);
  });

  test("reports a failure and retries on the next hover", async () => {
    const fortee = fakeFortee([{ error: "offline" }]);
    const store = createProposalStore(fortee);

    await expect(store.load(TALK_URL)).rejects.toThrow("offline");
    await expect(store.load(TALK_URL)).resolves.toMatchObject({ track: "Track B" });
  });

  test("reports a failure when the response is not a proposal page", async () => {
    const store = createProposalStore(fakeFortee([{ html: readFixture("timetable-day1.html") }]));

    await expect(store.load(TALK_URL)).rejects.toThrow(/proposal/i);
  });

  test("remembers a favourite toggle without refetching", async () => {
    const fortee = fakeFortee([]);
    const store = createProposalStore(fortee);

    await store.load(TALK_URL);
    await store.patch(TALK_URL, { favorited: true, favCount: 5 });

    await expect(store.load(TALK_URL)).resolves.toMatchObject({ favorited: true, favCount: 5 });
    expect(fortee.requested).toEqual([TALK_URL]);
  });
});
