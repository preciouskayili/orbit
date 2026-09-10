import type { IntegrationStore } from "./integrations/store.js";
import type { ModelRegistry } from "./agents/models.js";
import { integrationRoutes } from "./integrations/routes.js";
import { log, errorFields, withRequestId } from "./logger.js";
import { randomUUID, timingSafeEqual } from "node:crypto";
import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  CreateCloudComputerSchema,
  StartAgentRunSchema,
  AgentControlSchema,
} from "@orbit/shared";
import { ComputerError, type ComputerService } from "./computers/service.js";
import type { AgentRuns } from "./agents/service.js";
import { requireAccount, type AccountAccess } from "./auth.js";

export function createApp(options: {
  service?: ComputerService;
  agents?: AgentRuns;
  token?: string;
  workspaceId: string;
  accountAccess?: AccountAccess;
  integrations?: IntegrationStore;
  models?: ModelRegistry;
  computerConfig?: { configured: () => boolean; configure: (key: string) => Promise<void> };
}) {
  const app = express();

  app.disable("x-powered-by");

  app.use((req, res, next) => {
    const requestId = randomUUID();
    const started = performance.now();
    const path = req.path;

    res.locals.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);
    log("info", "request.started", { requestId, method: req.method, path });

    let completed = false;

    res.on("finish", () => {
      completed = true;
      log(
        res.statusCode >= 500
          ? "error"
          : res.statusCode >= 400
            ? "warn"
            : "info",
        "request.finished",
        {
          requestId,
          method: req.method,
          path,
          status: res.statusCode,
          durationMs: Math.round(performance.now() - started),
        },
      );
    });

    res.on("close", () => {
      if (!completed)
        log("warn", "request.disconnected", {
          requestId,
          method: req.method,
          path,
          durationMs: Math.round(performance.now() - started),
        });
    });

    withRequestId(requestId, next);
  });
  const origins = new Set([
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    "null",
  ]);
  app.use(
    cors({
      origin: (origin, callback) =>
        callback(null, !!origin && origins.has(origin)),
      methods: ["GET", "POST", "PATCH", "DELETE"],
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.get("/health", (_req, res) =>
    res.json({
      status: "ok",
      service: "orbit-api",
      computers: (options.computerConfig ? options.computerConfig.configured() : options.service) ? "daytona" : "unconfigured",
      agents: options.agents ? "connected" : "unconfigured",
    }),
  );

  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    if (!options.token)
      return res
        .status(503)
        .json({ message: "Set ORBIT_API_TOKEN on the local API server." });
    const supplied = Buffer.from(req.headers.authorization ?? "");
    const expected = Buffer.from("Bearer " + options.token);
    if (
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    ) {
      return res
        .status(401)
        .json({ message: "The local API token is missing or incorrect." });
    }

    next();
  });

  if (options.accountAccess) app.use('/api/workspaces/:workspaceId', requireAccount(options.accountAccess));

  if (options.integrations && options.models) app.use('/api/workspaces/:workspaceId/integrations', (req, res, next) => {
    if (req.params.workspaceId !== options.workspaceId) return res.status(403).json({ message: 'This backend is connected to a different workspace.' });
    next();
  }, integrationRoutes(options.integrations, options.models, options.computerConfig));

  const router = express.Router({ mergeParams: true });

  router.use((req, res, next) => {
    if (!options.service) return res.status(503).json({ message: "Configure Daytona on the API server to use computers." });
    if (
      (req.params as { workspaceId?: string }).workspaceId !==
      options.workspaceId
    ) {
      return res.status(403).json({
        message: "This local backend is connected to a different workspace.",
      });
    }
    next();
  });

  router.get("/", async (_req, res) => res.json(await options.service!.list()));

  router.post("/", async (req, res) => {
    const parsed = CreateCloudComputerSchema.safeParse(req.body);
    if (!parsed.success)
      throw new ComputerError(
        400,
        "Choose a supported computer with valid resources and a request ID.",
      );
    const { requestId, ...input } = parsed.data;
    res.status(201).json(await options.service!.create(input, requestId));
  });

  router.get("/:id", async (req, res) =>
    res.json(await options.service!.get(req.params.id)),
  );

  router.patch("/:id", async (req, res) => {
    const parsed = z
      .object({ name: z.string().trim().min(2).max(60) })
      .safeParse(req.body);
    if (!parsed.success)
      throw new ComputerError(400, "Use a name between 2 and 60 characters.");
    res.json(await options.service!.rename(req.params.id, parsed.data.name));
  });

  router.post("/:id/:action", async (req, res) => {
    if (req.params.action === "desktop")
      return res.json(await options.service!.desktop(req.params.id));
    if (req.params.action !== "start" && req.params.action !== "stop")
      throw new ComputerError(404, "Unknown computer action.");
    return res.json(
      await options.service!.status(req.params.id, req.params.action),
    );
  });

  app.use("/api/workspaces/:workspaceId/computers", router);

  const agents = express.Router({ mergeParams: true });

  agents.use((req, res, next) => {
    if (
      (req.params as { workspaceId?: string }).workspaceId !==
      options.workspaceId
    )
      return res.status(403).json({
        message: "This local backend is connected to a different workspace.",
      });
    if (!options.agents)
      return res.status(503).json({
        message:
          "Set OPENAI_API_KEY in apps/api/.env and restart the API to connect your agent.",
      });
    next();
  });

  agents.delete("/conversations/:id", async (req, res) => { await options.agents!.deleteConversation(req.params.id); res.json({ deleted: true }); });

  agents.post("/", (req, res) => {
    const parsed = StartAgentRunSchema.safeParse(req.body);
    if (!parsed.success)
      throw new ComputerError(
        400,
        "Invalid agent request. Shorten the conversation or check its computers and tool profile.",
      );
    res.status(201).json(options.agents!.start(parsed.data));
  });

  agents.get("/:id", (req, res) =>
    res.json(options.agents!.get(req.params.id)),
  );

  agents.post("/:id", (req, res) => {
    const parsed = AgentControlSchema.safeParse(req.body);
    if (!parsed.success) throw new ComputerError(400, "Invalid agent control.");
    res.json(options.agents!.control(req.params.id, parsed.data));
  });

  app.use("/api/workspaces/:workspaceId/agent-runs", agents);
  app.use((_req, res) => res.status(404).json({ message: "Route not found" }));
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      log("error", "request.failed", {
        requestId: res.locals.requestId,
        ...errorFields(error),
      });
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid settings. Check the fields and try again." });
      if (error instanceof ComputerError)
        return res.status(error.status).json({ message: error.message });
      const status =
        (error as { status?: number; statusCode?: number })?.status ??
        (error as { statusCode?: number })?.statusCode;
      if (status === 413)
        return res.status(413).json({
          message:
            "This request is too large. Start a new conversation with a shorter summary.",
        });
      if (status === 400)
        return res.status(400).json({
          message:
            "Daytona rejected this configuration. Check your account’s per-computer CPU, memory, and disk limits.",
        });
      if (error instanceof SyntaxError)
        return res.status(400).json({ message: "Invalid request." });
      if (status === 404)
        return res.status(404).json({ message: "Computer not found." });
      // SDK exceptions can contain request headers. Never serialize or log them.
      return res.status(502).json({
        message:
          "Daytona could not complete this request. Check your API key, account limits, and connection, then retry.",
      });
    },
  );

  return app;
}
