import { timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { CreateCloudComputerSchema } from "@orbit/shared";
import { ComputerError, type ComputerService } from "./computers/service.js";

export function createApp(options: { service?: ComputerService; token?: string; workspaceId: string }) {
  const app = express();
  app.disable("x-powered-by");
  const origins = new Set(["http://127.0.0.1:5173", "http://localhost:5173", "null"]);
  app.use(cors({ origin: (origin, callback) => callback(null, !!origin && origins.has(origin)), methods: ["GET", "POST", "PATCH"] }));
  app.use(express.json({ limit: "16kb" }));
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "orbit-api", computers: options.service ? "daytona" : "unconfigured" }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!options.token) return res.status(503).json({ message: "Set ORBIT_API_TOKEN on the local API server." });
    const supplied = Buffer.from(req.headers.authorization ?? "");
    const expected = Buffer.from("Bearer " + options.token);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ message: "The local API token is missing or incorrect." });
    }
    if (!options.service) return res.status(503).json({ message: "Set DAYTONA_API_KEY on the API server to connect real computers." });
    next();
  });
  const router = express.Router({ mergeParams: true });
  router.use((req, res, next) => {
    if ((req.params as { workspaceId?: string }).workspaceId !== options.workspaceId) {
      return res.status(403).json({ message: "This local backend is connected to a different workspace." });
    }
    next();
  });
  router.get("/", async (_req, res) => res.json(await options.service!.list()));
  router.post("/", async (req, res) => {
    const parsed = CreateCloudComputerSchema.safeParse(req.body);
    if (!parsed.success) throw new ComputerError(400, "Choose a Linux computer with valid resources and a request ID.");
    const { requestId, ...input } = parsed.data;
    res.status(201).json(await options.service!.create(input, requestId));
  });
  router.get("/:id", async (req, res) => res.json(await options.service!.get(req.params.id)));
  router.patch("/:id", async (req, res) => {
    const parsed = z.object({ name: z.string().trim().min(2).max(60) }).safeParse(req.body);
    if (!parsed.success) throw new ComputerError(400, "Use a name between 2 and 60 characters.");
    res.json(await options.service!.rename(req.params.id, parsed.data.name));
  });
  router.post("/:id/:action", async (req, res) => {
    if (req.params.action === "desktop") return res.json(await options.service!.desktop(req.params.id));
    if (req.params.action !== "start" && req.params.action !== "stop") throw new ComputerError(404, "Unknown computer action.");
    return res.json(await options.service!.status(req.params.id, req.params.action));
  });
  app.use("/api/workspaces/:workspaceId/computers", router);
  app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ComputerError) return res.status(error.status).json({ message: error.message });
    const status = (error as { status?: number; statusCode?: number })?.status ?? (error as { statusCode?: number })?.statusCode;
    if (status === 400) return res.status(400).json({ message: "Daytona rejected this configuration. Check your account’s per-computer CPU, memory, and disk limits." });
    if (error instanceof SyntaxError) return res.status(400).json({ message: "Invalid request." });
    if (status === 404) return res.status(404).json({ message: "Computer not found." });
    // SDK exceptions can contain request headers. Never serialize or log them.
    return res.status(502).json({ message: "Daytona could not complete this request. Check your API key, account limits, and connection, then retry." });
  });
  return app;
}
