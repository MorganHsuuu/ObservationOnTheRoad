const PRODUCTION_ORIGIN = "https://observation-on-the-road.vercel.app";

function trimSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function publicJoinOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return trimSlash(configured);

  if (typeof window === "undefined") return PRODUCTION_ORIGIN;

  const { origin } = window.location;
  if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
    return PRODUCTION_ORIGIN;
  }
  return origin;
}

export function publicJoinUrl(slug: string) {
  return `${publicJoinOrigin()}/e/${slug}`;
}
