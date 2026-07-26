export type DurationDisplayUnit = "minutes" | "hours";

export function normalizeDurationUnit(unit?: string | null): DurationDisplayUnit {
  return unit === "hours" ? "hours" : "minutes";
}

/** Format package duration using the unit chosen in admin. */
export function formatDuration(
  durationMinutes?: number | null,
  displayUnit?: string | null,
  options?: { short?: boolean }
): string {
  const minutes = Number(durationMinutes);
  if (!Number.isFinite(minutes) || minutes <= 0) return "";

  const short = options?.short !== false;
  const unit = normalizeDurationUnit(displayUnit);

  if (unit === "hours") {
    const hours = minutes / 60;
    const value = Number.isInteger(hours)
      ? String(hours)
      : String(Math.round(hours * 100) / 100);
    if (short) return `${value} hr`;
    return `${value} ${Number(hours) === 1 ? "hour" : "hours"}`;
  }

  if (short) return `${minutes} min`;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
