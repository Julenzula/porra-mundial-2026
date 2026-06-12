import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "porra_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD ?? null;
}

export function getMissingAdminPasswordError() {
  return "Missing ADMIN_PASSWORD";
}

export function createAdminSessionValue(password: string) {
  const issuedAt = String(Date.now());
  return `v1.${issuedAt}.${signValue(issuedAt, password)}`;
}

export function verifyAdminSessionValue(value: string | undefined, password: string) {
  if (!value) return false;

  const [, issuedAt, signature] = value.split(".");
  if (!issuedAt || !signature) return false;

  const ageMs = Date.now() - Number(issuedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > SESSION_MAX_AGE_SECONDS * 1000) return false;

  const expected = signValue(issuedAt, password);
  return safeEqual(signature, expected);
}

export async function isAdminAuthenticated() {
  const password = getAdminPassword();
  if (!password) return false;

  const cookieStore = await cookies();
  return verifyAdminSessionValue(cookieStore.get(ADMIN_SESSION_COOKIE)?.value, password);
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

function signValue(value: string, password: string) {
  return createHmac("sha256", password).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}
