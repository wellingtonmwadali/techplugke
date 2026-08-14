import compression from "compression";
import cors from "cors";
import express from "express";
import { config } from "./config/env.js";
import helmet from "helmet";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { healthRouter } from "./routes/health.js";
import { marketingRouter } from "./routes/marketing.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { placementsRouter } from "./routes/placements.js";
import { productsRouter } from "./routes/products.js";
import { settingsRouter } from "./routes/settings.js";
import { teamRouter } from "./routes/team.js";
import { usersRouter } from "./routes/users.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
// Most response payloads of consequence here embed base64 product images, so gzip roughly
// halves them over the wire.
app.use(compression());
// Raised from Express's 100kb default — product images are stored as base64 data URIs
// directly in the request body (see techplug-admin/src/lib/uploadImage.ts).
app.use(express.json({ limit: "15mb" }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/marketing", marketingRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/placements", placementsRouter);
app.use("/api/products", productsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/team", teamRouter);
app.use("/api/users", usersRouter);

// Catches errors forwarded via next(err) and — for Express 4, which doesn't auto-catch
// async route rejections — anything that reaches here through the process-level
// unhandledRejection backstop in index.ts. Always returns clean JSON instead of hanging
// the request or leaking a stack trace.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});
