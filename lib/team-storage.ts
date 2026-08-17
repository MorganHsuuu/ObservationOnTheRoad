import type { StoredTeam } from "@/lib/types";

const cache = new Map<string, { raw: string | null; value: StoredTeam | null }>();

export function teamStorageKey(slug: string) {
  return `observe:${slug}:team`;
}

export function readStoredTeam(slug: string): StoredTeam | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(teamStorageKey(slug));
  const hit = cache.get(slug);
  if (hit && hit.raw === raw) return hit.value;

  let value: StoredTeam | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as StoredTeam;
      if (
        parsed.teamId &&
        parsed.eventSlug === slug &&
        parsed.studentId &&
        parsed.studentName
      ) {
        value = parsed;
      }
    } catch {
      value = null;
    }
  }
  cache.set(slug, { raw, value });
  return value;
}

export function writeStoredTeam(team: StoredTeam) {
  const raw = JSON.stringify(team);
  localStorage.setItem(teamStorageKey(team.eventSlug), raw);
  cache.set(team.eventSlug, { raw, value: team });
}

export function clearStoredTeam(slug: string) {
  localStorage.removeItem(teamStorageKey(slug));
  cache.set(slug, { raw: null, value: null });
}

export function subscribeTeamStorage(slug: string, onStoreChange: () => void) {
  const key = teamStorageKey(slug);
  const onStorage = (event: StorageEvent) => {
    if (event.key === key) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
