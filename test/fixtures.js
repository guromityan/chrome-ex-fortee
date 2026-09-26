import day1 from "./fixtures/timetable-day1.html?raw";
import preparty from "./fixtures/timetable-preparty.html?raw";
import proposalDetail from "./fixtures/proposal-detail.html?raw";

/**
 * Real pages saved from fortee.jp, so the selectors under test face the actual DOM.
 */
export const fixtures = {
  "timetable-day1.html": day1,
  "timetable-preparty.html": preparty,
  "proposal-detail.html": proposalDetail,
};

/** @param {keyof typeof fixtures} name */
export const readFixture = (name) => {
  const html = fixtures[name];
  if (!html) throw new Error(`Unknown fixture: ${name}`);
  return html;
};

/** @param {keyof typeof fixtures} name */
export const loadFixture = (name) =>
  new DOMParser().parseFromString(readFixture(name), "text/html");
