import { finalizeEventPin, isEventPin } from "@/lib/team-code";
import type { EventRow } from "@/lib/types";

export { finalizeEventPin, isEventPin };

export function eventPinCookieName(slug: string) {
  return `observe-pin-${slug}`;
}

export function eventPinStorageKey(slug: string) {
  return `observe:${slug}:pin`;
}

export function eventPinOkKey(slug: string) {
  return `observe:${slug}:pin-ok`;
}

export function mapEventRow(
  row: Omit<EventRow, "requires_pin" | "entry_pin"> & {
    entry_pin?: string | null;
    requires_pin?: boolean;
  },
  exposePin = false,
): EventRow {
  const pin = row.entry_pin ?? null;
  return {
    ...row,
    entry_pin: exposePin ? pin : null,
    requires_pin: Boolean(pin) || Boolean(row.requires_pin),
  };
}
