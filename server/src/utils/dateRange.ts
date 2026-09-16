import { DateRange } from "../adapters/types";

function parseDateParam(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

/** Parses ?start=&end= query params, defaulting to the last 30 days. Returns
 * null (instead of throwing) when start is after end, so callers can 400. */
export function parseDateRangeQuery(query: Record<string, unknown>): DateRange | null {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 30);

  const start = parseDateParam(query.start, defaultStart);
  const end = parseDateParam(query.end, now);

  if (start > end) return null;
  return { start, end };
}
