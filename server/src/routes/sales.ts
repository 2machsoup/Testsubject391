import { Router } from "express";
import { getAggregatedSales } from "../services/aggregator";

export const salesRouter = Router();

function parseDateParam(value: unknown, fallback: Date): Date {
  if (typeof value !== "string" || !value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

salesRouter.get("/", async (req, res, next) => {
  try {
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const start = parseDateParam(req.query.start, defaultStart);
    const end = parseDateParam(req.query.end, now);

    if (start > end) {
      res.status(400).json({ error: "start date must be before end date" });
      return;
    }

    const data = await getAggregatedSales({ start, end });
    res.json(data);
  } catch (err) {
    next(err);
  }
});
