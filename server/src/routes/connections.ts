import { Router } from "express";
import { adapterList } from "../adapters";

export const connectionsRouter = Router();

connectionsRouter.get("/", async (_req, res, next) => {
  try {
    const statuses = await Promise.all(adapterList.map((a) => a.getConnectionStatus()));
    res.json({ connections: statuses });
  } catch (err) {
    next(err);
  }
});
