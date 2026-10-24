import { createHmac, timingSafeEqual } from "node:crypto";
import {
  deleteCookie,
  getCookie,
  getRequest,
  getRequestProtocol,
  setCookie,
} from "@tanstack/react-start/server";

/**
 * Single-owner sign-in. One password (CARTOGRAPHER_PASSWORD) unlocks the desk;
 * a signed cookie keeps you in for 60 days. No accounts, no outside login service.
 *
 * Changing the password signs every device out (the cookie is signed with a key
 * derived from it, unless CARTOGRAPHER_SECRET is set).
 */

export const OWNER_ID = "owner";
const COOKIE = "ic_owner";
const MAX_AGE_S = 60 * 24 * 60 * 60;

function env(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

export function passwordSet(): boolean {
  return Boolean(env("CARTOGRAPHER_PASSWORD"));
}

/** Local `npm run dev` with no password set: the desk is open on this machine only. */
export function devOpen(): boolean {
  return !passwordSet() && process.env.NODE_ENV !== "production";
}

function key(): Buffer {
  const secret = env("CARTOGRAPHER_SECRET") ?? `pw:${env("CARTOGRAPHER_PASSWORD") ?? ""}`;
  return createHmac("sha256", "idea-cartographer/v1").update(secret).digest();
}

function sign(payload: string): string {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function hasValidCookie(): boolean {
  if (!passwordSet()) return false;
  const raw = getCookie(COOKIE);
  if (!raw) return false;
  const [expires, mac] = raw.split(".");
  if (!expires || !mac || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Date.now()) return false;
  return same(mac, sign(expires));
}

export function isOwner(): boolean {
  return devOpen() || hasValidCookie();
}

/** Block scripted requests from other sites (the cookie is SameSite=Lax as well). */
export function assertSameSite(): void {
  const h = getRequest()?.headers;
  const site = h?.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new Error("Forbidden");
  }
}

// Failed-attempt throttle. In memory: right for a single Node server on your
// own machine; on a serverless host it resets per instance.
const failures = { count: 0, until: 0 };

export async function checkPassword(attempt: string): Promise<string | null> {
  const pw = env("CARTOGRAPHER_PASSWORD");
  if (!pw) return "No password is set. Set CARTOGRAPHER_PASSWORD on the server and restart it.";
  if (Date.now() < failures.until) {
    return "Too many wrong passwords. Wait a minute and try again.";
  }
  // Compare digests so length differences don't leak through timing.
  const a = createHmac("sha256", "cmp").update(attempt).digest();
  const b = createHmac("sha256", "cmp").update(pw).digest();
  if (!timingSafeEqual(a, b)) {
    failures.count += 1;
    if (failures.count >= 5) {
      failures.until = Date.now() + 60_000;
      failures.count = 0;
    }
    await new Promise((r) => setTimeout(r, 600));
    return "Wrong password.";
  }
  failures.count = 0;
  const expires = String(Date.now() + MAX_AGE_S * 1000);
  setCookie(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: getRequestProtocol() === "https",
    path: "/",
    maxAge: MAX_AGE_S,
  });
  return null;
}

export function clearSession(): void {
  deleteCookie(COOKIE, { path: "/" });
}
