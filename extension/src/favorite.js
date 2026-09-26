/**
 * fortee's favourite toggle — same endpoint the site's own star button uses.
 *
 * POST /<event>/proposal/fav  body: uuid=<uuid>&on=true|false
 * Success JSON: { result: "OK", data: { uuid, on } }
 * Logged-out visitors get a redirect (or HTML login page) instead of JSON.
 */

/**
 * @typedef {object} FavoriteResult
 * @property {string} uuid
 * @property {boolean} on
 */

/**
 * @param {object} args
 * @param {string} args.apiUrl
 * @param {string} args.uuid
 * @param {boolean} args.on
 * @param {typeof fetch} [args.fetchImpl]
 * @returns {Promise<FavoriteResult>}
 */
export async function setFavorite({ apiUrl, uuid, on, fetchImpl = fetch }) {
  const response = await fetchImpl(apiUrl, {
    method: "POST",
    credentials: "same-origin",
    redirect: "manual",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ uuid, on: on ? "true" : "false" }),
  });

  if (
    response.type === "opaqueredirect" ||
    response.status === 301 ||
    response.status === 302 ||
    response.status === 303 ||
    response.status === 307 ||
    response.status === 308
  ) {
    throw Object.assign(new Error("ログインが必要です"), { code: "login_required" });
  }

  if (!response.ok) {
    throw Object.assign(new Error(`お気に入りの更新に失敗しました（${response.status}）`), {
      code: "http_error",
      status: response.status,
    });
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw Object.assign(new Error("ログインが必要です"), { code: "login_required" });
  }

  const payload = await response.json();
  if (payload?.result !== "OK") {
    const message = payload?.data?.error || "お気に入りの更新に失敗しました";
    throw Object.assign(new Error(message), { code: "api_error", payload });
  }

  return { uuid: String(payload.data.uuid), on: Boolean(payload.data.on) };
}

/**
 * fortee paints a pink ribbon on timetable cells with class `fav`.
 *
 * @param {Document} doc
 * @param {string} uuid
 * @param {boolean} on
 */
export function syncTimetableFavorite(doc, uuid, on) {
  const link = doc.querySelector(`.proposal a[href*="/proposal/${uuid}"]`);
  const cell = link?.closest(".proposal");
  if (!cell) return;
  cell.classList.toggle("fav", on);
}
