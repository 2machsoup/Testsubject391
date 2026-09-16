import { Router } from "express";
import { getSkuMetrics } from "../services/skuAggregator";
import { parseDateRangeQuery } from "../utils/dateRange";

export const skusRouter = Router();

skusRouter.get("/", async (req, res, next) => {
  try {
    const range = parseDateRangeQuery(req.query as Record<string, unknown>);
    if (!range) {
      res.status(400).json({ error: "start date must be before end date" });
      return;
    }

    const data = await getSkuMetrics(range);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
