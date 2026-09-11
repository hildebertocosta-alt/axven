const OPERATIONAL_TIMEZONE = "America/Sao_Paulo";

function localDateParts(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function shiftDate(date: { year: number; month: number; day: number }, days: number) {
  const shifted = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return shifted.toISOString().slice(0, 10);
}

export function calculateMetaSyncWindow(
  now = new Date(),
  timeZone = OPERATIONAL_TIMEZONE,
) {
  const today = localDateParts(now, timeZone);
  return {
    inicio: shiftDate(today, -7),
    fim: shiftDate(today, -1),
    timeZone,
  };
}

export { OPERATIONAL_TIMEZONE };
