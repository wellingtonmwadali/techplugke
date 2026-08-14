import { Router } from "express";
import { getConnectionState } from "../db/mongoose.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", mongo: getConnectionState() });
});
