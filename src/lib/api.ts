export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
type RequestOptions = { method?: string; body?: unknown };

/*
 * Speed layer for the admin panel.
 * - GET answers are kept in memory, so opening a section you already visited shows its table instantly
 *   (see peekCached); the page then re-checks in the background.
 * - The server sends ETags: the browser re-validates with "If-None-Match" and gets a tiny 304 when nothing changed
 *   (that is what `cache: "no-cache"` does), so a re-check costs almost nothing.
 * - Any write (create / edit / delete / approve ...) clears the memory cache, so a table never shows outdated rows after an action.
 * - Identical GETs that are in flight at the same time share one request.
 */
const MAX_CACHED = 60;
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<any>>();

export const peekCached = <T = any>(path: string): T | undefined => cache.get(path) as T | undefined;
export const clearApiCache = () => { cache.clear(); inflight.clear(); adminMemo = null; };

async function send(path: string, method: string, body?: unknown) {
  const response = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    // GET: always ask the server, but let the browser use the ETag (304 = no body to download).
    cache: method === "GET" ? "no-cache" : "no-store",
  });
  const data = await response.json().catch(() => ({ message: "Unexpected server response" }));
  if (!response.ok) {
    if (response.status === 401) clearApiCache();
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export async function request(path: string, input?: RequestOptions | Record<string, unknown>) {
  // No second argument = a plain GET. (It used to default to `{}`, which turned every GET into a POST with an empty body -> 404.)
  // Backwards-compatible: auth pages pass the request body directly.
  const isOptions = !!input && (Object.prototype.hasOwnProperty.call(input, "method") || Object.prototype.hasOwnProperty.call(input, "body"));
  const options: RequestOptions = input === undefined ? {} : isOptions ? input as RequestOptions : { body: input };
  const method = options.method || (options.body === undefined ? "GET" : "POST");

  if (method !== "GET") {
    try { return await send(path, method, options.body); }
    finally { cache.clear(); if (path.startsWith("/auth/")) adminMemo = null; } // something may have changed
  }

  const running = inflight.get(path);
  if (running) return running;
  const p = send(path, "GET").then((data) => {
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
    cache.set(path, data);
    return data;
  }).finally(() => inflight.delete(path));
  inflight.set(path, p);
  return p;
}

/** The signed-in admin. Asked once and remembered for 5 minutes, instead of on every table load. */
let adminMemo: { at: number; value: Promise<any> } | null = null;
export function getAdmin(): Promise<any> {
  if (adminMemo && Date.now() - adminMemo.at < 5 * 60_000) return adminMemo.value;
  const value = request("/auth/me").then((r) => r.admin).catch((e) => { adminMemo = null; throw e; });
  adminMemo = { at: Date.now(), value };
  return value;
}

/** Quietly download a list in the background so the next click on it is instant. */
export function prefetch(paths: string[], gapMs = 250) {
  paths.forEach((path, i) => {
    if (cache.has(path) || inflight.has(path)) return;
    setTimeout(() => { if (!cache.has(path)) void request(path).catch(() => undefined); }, i * gapMs);
  });
}
