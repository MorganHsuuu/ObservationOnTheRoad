const TAIPEI = "Asia/Taipei";

export function formatTaipeiTime(value: string | Date) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function formatTaipeiDate(value: string | Date | null) {
  if (!value) return "日期未定";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: TAIPEI,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replace(/\//g, ".");
}

export function nowTaipeiLabel() {
  return formatTaipeiTime(new Date());
}

export function taskCode(orderIndex: number) {
  return String(orderIndex).padStart(2, "0");
}
