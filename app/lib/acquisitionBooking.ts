export const ACQUISITION_TIMEZONE = "America/Sao_Paulo";
export const MINIMUM_BOOKING_NOTICE_HOURS = 8;
export const ACQUISITION_SLOT_HOURS = [9, 10, 14, 15, 16, 17] as const;
export const ACQUISITION_SLOT_DURATION_MINUTES = 45;
export const ACQUISITION_BOOKING_HORIZON_DAYS = 21;

type LocalParts = {
  year: string;
  month: string;
  day: string;
  weekday: string;
  hour?: string;
  minute?: string;
};

export function zonedParts(date: Date): LocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ACQUISITION_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value])) as LocalParts;
}

export function zonedDate(year: string, month: string, day: string, hour: number) {
  const desiredAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), hour);
  let candidate = new Date(desiredAsUtc);

  // Intl exposes the local wall clock, so adjust the UTC candidate until that
  // wall clock equals the requested time. The second pass covers offset edges.
  for (let pass = 0; pass < 2; pass += 1) {
    const local = zonedParts(candidate);
    const representedAsUtc = Date.UTC(
      Number(local.year),
      Number(local.month) - 1,
      Number(local.day),
      Number(local.hour),
      Number(local.minute),
    );
    candidate = new Date(candidate.getTime() + desiredAsUtc - representedAsUtc);
  }
  return candidate;
}

export function minimumBookingTime(now: Date) {
  return new Date(now.getTime() + MINIMUM_BOOKING_NOTICE_HOURS * 60 * 60 * 1000);
}

export function isAllowedAcquisitionSlot(date: Date, now: Date) {
  const latest = now.getTime() + ACQUISITION_BOOKING_HORIZON_DAYS * 24 * 60 * 60 * 1000;
  if (Number.isNaN(date.getTime()) || date.getTime() < minimumBookingTime(now).getTime() || date.getTime() > latest) return false;
  const local = zonedParts(date);
  return (
    !["Sat", "Sun"].includes(local.weekday) &&
    ACQUISITION_SLOT_HOURS.includes(Number(local.hour) as (typeof ACQUISITION_SLOT_HOURS)[number]) &&
    Number(local.minute) === 0
  );
}

export function buildAcquisitionSlots(now: Date, occupiedStarts: Set<string>) {
  const slots: string[] = [];
  for (let dayOffset = 0; dayOffset < ACQUISITION_BOOKING_HORIZON_DAYS && slots.length < 30; dayOffset += 1) {
    const cursor = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const local = zonedParts(cursor);
    if (["Sat", "Sun"].includes(local.weekday)) continue;
    for (const hour of ACQUISITION_SLOT_HOURS) {
      const slot = zonedDate(local.year, local.month, local.day, hour);
      if (!isAllowedAcquisitionSlot(slot, now)) continue;
      if (!occupiedStarts.has(slot.toISOString())) slots.push(slot.toISOString());
    }
  }
  return slots;
}
