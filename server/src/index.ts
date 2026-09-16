import express from "express";
import cors from "cors";
import "./db";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { connectionsRouter } from "./routes/connections";
import { salesRouter } from "./routes/sales";
import { localPosRouter } from "./routes/localPos";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/connections", connectionsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/local-pos", localPosRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Sales dashboard API listening on http://localhost:${config.port}`);
});
