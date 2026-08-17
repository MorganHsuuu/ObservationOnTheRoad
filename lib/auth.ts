import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/auth-constants";

export { ADMIN_COOKIE };
const COOKIE_MAX_AGE = 60 * 60 * 12;

function sessionToken() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("observe-admin").digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyAdminPassword(input: string) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  return safeEqual(input, password);
}

export async function isAdminAuthed() {
  const token = sessionToken();
  if (!token) return false;
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, token);
}

export async function setAdminCookie() {
  const token = sessionToken();
  if (!token) throw new Error("尚未設定 ADMIN_PASSWORD");
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function requireAdmin() {
  if (!(await isAdminAuthed())) {
    throw new Error("未登入");
  }
}
