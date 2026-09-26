import { describe, expect, test, vi } from "vitest";

import { setFavorite, syncTimetableFavorite } from "../extension/src/favorite.js";

describe("setFavorite", () => {
  test("POSTs uuid and on to fortee's fav endpoint", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ result: "OK", data: { uuid: "abc", on: true } }),
    );

    await expect(
      setFavorite({
        apiUrl: "/yapc-tokyo-2026/proposal/fav",
        uuid: "abc",
        on: true,
        fetchImpl,
      }),
    ).resolves.toEqual({ uuid: "abc", on: true });

    expect(fetchImpl).toHaveBeenCalledOnce();
    const call = /** @type {[unknown, RequestInit]} */ (/** @type {unknown} */ (fetchImpl.mock.calls[0]));
    expect(call[0]).toBe("/yapc-tokyo-2026/proposal/fav");
    expect(call[1].method).toBe("POST");
    expect(call[1].credentials).toBe("same-origin");
    expect(String(call[1].body)).toBe("uuid=abc&on=true");
  });

  test("sends on=false when removing a favourite", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ result: "OK", data: { uuid: "abc", on: false } }),
    );

    await expect(
      setFavorite({
        apiUrl: "/yapc-tokyo-2026/proposal/fav",
        uuid: "abc",
        on: false,
        fetchImpl,
      }),
    ).resolves.toEqual({ uuid: "abc", on: false });

    const call = /** @type {[unknown, RequestInit]} */ (/** @type {unknown} */ (fetchImpl.mock.calls[0]));
    expect(String(call[1].body)).toBe("uuid=abc&on=false");
  });

  test("reports login_required when fortee redirects to login", async () => {
    const fetchImpl = vi.fn(async () => {
      const response = new Response(null, {
        status: 302,
        headers: { Location: "/login?redirect=%2Fyapc-tokyo-2026%2Fproposal%2Ffav" },
      });
      Object.defineProperty(response, "type", { value: "opaqueredirect" });
      return response;
    });

    await expect(
      setFavorite({
        apiUrl: "/yapc-tokyo-2026/proposal/fav",
        uuid: "abc",
        on: true,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "login_required" });
  });

  test("reports login_required when the JSON body is missing (HTML login page)", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("<html>login</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
    );

    await expect(
      setFavorite({
        apiUrl: "/yapc-tokyo-2026/proposal/fav",
        uuid: "abc",
        on: true,
        fetchImpl,
      }),
    ).rejects.toMatchObject({ code: "login_required" });
  });

  test("rejects when fortee returns a non-OK result", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ result: "ERROR", data: { error: "nope" } }),
    );

    await expect(
      setFavorite({
        apiUrl: "/yapc-tokyo-2026/proposal/fav",
        uuid: "abc",
        on: true,
        fetchImpl,
      }),
    ).rejects.toThrow(/ERROR|nope|favourite/i);
  });
});

describe("syncTimetableFavorite", () => {
  test("adds the fav class so the pink ribbon appears on the cell", () => {
    document.body.innerHTML = `
      <div class="proposal proposal-in-timetable">
        <a href="/yapc-tokyo-2026/proposal/abc-123">Talk</a>
      </div>`;

    syncTimetableFavorite(document, "abc-123", true);

    expect(document.querySelector(".proposal")?.classList.contains("fav")).toBe(true);
  });

  test("removes the fav class when the talk is unfavourited", () => {
    document.body.innerHTML = `
      <div class="proposal proposal-in-timetable fav">
        <a href="/yapc-tokyo-2026/proposal/abc-123">Talk</a>
      </div>`;

    syncTimetableFavorite(document, "abc-123", false);

    expect(document.querySelector(".proposal")?.classList.contains("fav")).toBe(false);
  });
});
