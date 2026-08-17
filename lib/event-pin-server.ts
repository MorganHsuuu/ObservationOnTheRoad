import { cookies } from "next/headers";
import { adminEventPinCookieName, eventPinCookieName } from "@/lib/event-pin";

const PIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

export async function hasEventPinCookie(slug: string) {
  const store = await cookies();
  return store.get(eventPinCookieName(slug))?.value === "ok";
}

export async function setEventPinCookie(slug: string) {
  const store = await cookies();
  store.set(eventPinCookieName(slug), "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });
}

export async function hasAdminEventPinCookie(slug: string) {
  const store = await cookies();
  return store.get(adminEventPinCookieName(slug))?.value === "ok";
}

export async function setAdminEventPinCookie(slug: string) {
  const store = await cookies();
  store.set(adminEventPinCookieName(slug), "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PIN_COOKIE_MAX_AGE,
  });
}
