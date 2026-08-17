const ADMIN_PASSWORD_KEY = "observe:admin:password";

export function lastCodeKey(slug: string) {
  return `observe:${slug}:last-code`;
}

export function readRememberedAdminPassword() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_PASSWORD_KEY) ?? "";
}

export function writeRememberedAdminPassword(password: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

export function readRememberedTeamCode(slug: string) {
  if (typeof window === "undefined") return "";
  return (localStorage.getItem(lastCodeKey(slug)) ?? "").toUpperCase();
}

export function writeRememberedTeamCode(slug: string, code: string) {
  localStorage.setItem(lastCodeKey(slug), code.trim().toUpperCase());
}
