export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function finalizeTeamCode(raw: string) {
  const digits = digitsOnly(raw).slice(0, 2);
  if (!digits) return "";
  return digits.padStart(2, "0");
}

export function isTeamCode(code: string) {
  return /^\d{2}$/.test(code);
}

export function teamNameFromCode(code: string) {
  return `第 ${Number(code)} 組`;
}

export function teamLabel(
  team?: { name?: string | null; code?: string | null } | null,
) {
  const code = finalizeTeamCode(team?.code || team?.name || "");
  if (isTeamCode(code)) return teamNameFromCode(code);
  return team?.name?.trim() || "未知組別";
}

export function sanitizeStudentId(raw: string) {
  return raw.trim().slice(0, 32);
}

export function sanitizeStudentName(raw: string) {
  return raw.trim().slice(0, 40);
}

export function finalizeEventPin(raw: string) {
  return digitsOnly(raw).slice(0, 4);
}

export function isEventPin(pin: string) {
  return /^\d{4}$/.test(pin);
}
