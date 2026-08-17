import { digitsOnly } from "@/lib/team-code";

const ADMIN_PASSWORD_KEY = "observe:admin:password";

export type RememberedJoin = {
  code: string;
  studentId: string;
  studentName: string;
};

export function lastJoinKey(slug: string) {
  return `observe:${slug}:join`;
}

export function readRememberedAdminPassword() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ADMIN_PASSWORD_KEY) ?? "";
}

export function writeRememberedAdminPassword(password: string) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

export function readRememberedJoin(slug: string): RememberedJoin {
  if (typeof window === "undefined") {
    return { code: "", studentId: "", studentName: "" };
  }
  const raw = localStorage.getItem(lastJoinKey(slug));
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Partial<RememberedJoin>;
      return {
        code: digitsOnly(String(parsed.code ?? "")).slice(0, 2),
        studentId: String(parsed.studentId ?? ""),
        studentName: String(parsed.studentName ?? ""),
      };
    } catch {
      /* fall through */
    }
  }
  const legacyCode = digitsOnly(localStorage.getItem(`observe:${slug}:last-code`) ?? "").slice(0, 2);
  return { code: legacyCode.slice(0, 2), studentId: "", studentName: "" };
}

export function writeRememberedJoin(slug: string, value: RememberedJoin) {
  localStorage.setItem(lastJoinKey(slug), JSON.stringify(value));
}
