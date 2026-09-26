import { describe, expect, test } from "vitest";

import { parseProposalDetail } from "../extension/src/proposal-page.js";
import { readFixture } from "./fixtures.js";

const detailOf = (name) => parseProposalDetail(readFixture(name));

describe("parseProposalDetail", () => {
  test("reads the headline facts a hover preview shows", () => {
    expect(detailOf("proposal-detail.html")).toMatchObject({
      title: "Do we need (any more) computer languages?",
      status: "採択",
      schedule: "2026/11/28 16:30〜",
      track: "Track B",
      duration: "20分",
      favCount: 4,
      favApiUrl: "/yapc-tokyo-2026/proposal/fav",
      uuid: "c38049d1-b9d8-4121-970b-3e9246070e64",
      loggedIn: false,
      favorited: false,
      speaker: {
        name: "Dan Kogai",
        avatarUrl: "/files/yapc-tokyo-2026/speaker/28d2d52c-cd04-48c0-bbcd-1f58cb578bb1.jpg",
        twitter: "dankogai",
      },
    });
  });

  test("notices when the visitor has already favourited the talk", () => {
    const html = readFixture("proposal-detail.html").replace(
      'class="mR-20 fav proposal-fav"',
      'class="mR-20 fav proposal-fav active"',
    ).replace('data-logged-in="false"', 'data-logged-in="true"');

    expect(parseProposalDetail(html)).toMatchObject({
      loggedIn: true,
      favorited: true,
    });
  });

  test("keeps the abstract as markup so lists stay readable", () => {
    const { abstractHtml } = detailOf("proposal-detail.html");

    expect(abstractHtml).toContain("<h2>Short answer: no. But give me 20 minutes to explain why.</h2>");
    expect(abstractHtml).toContain("<li>ケーススタディ：Perlが上手いのはどっち? Claude? Dan?");
  });

  test("returns null when the response is not a proposal page", () => {
    expect(detailOf("timetable-day1.html")).toBeNull();
  });
});
