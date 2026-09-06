import { log } from "./logger.js";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona } from "@daytona/sdk";
import { createApp } from "./app.js";
import { DaytonaComputers } from "./computers/service.js";

const port = Number(process.env.API_PORT ?? 4000);
const workspaceId = process.env.ORBIT_WORKSPACE_ID || "personal";
const directory = resolve(process.env.ORBIT_DATA_DIR || ".data");
mkdirSync(directory, { recursive: true });
const instanceFile = resolve(directory, "instance-id");
try { writeFileSync(instanceFile, randomUUID(), { flag: "wx", mode: 0o600 }); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
const instanceId = readFileSync(instanceFile, "utf8").trim();
const autoStopMinutes = Number(process.env.DAYTONA_AUTO_STOP_MINUTES ?? 30);
const vncPort = Number(process.env.DAYTONA_VNC_PORT ?? 6080);
if (!Number.isInteger(autoStopMinutes) || autoStopMinutes < 0) throw new Error("DAYTONA_AUTO_STOP_MINUTES must be a nonnegative integer.");
if (!Number.isInteger(vncPort) || vncPort < 1 || vncPort > 65535) throw new Error("Invalid DAYTONA_VNC_PORT.");
const service = process.env.DAYTONA_API_KEY ? new DaytonaComputers(new Daytona({ requestTimeoutMs: 30_000 }), {
  workspaceId, instanceId, autoStopMinutes, vncPort,
  image: process.env.DAYTONA_DESKTOP_IMAGE || "daytonaio/sandbox:0.6.0",
}) : undefined;
const app = createApp({ service, token: process.env.ORBIT_API_TOKEN, workspaceId });
app.listen(port, "127.0.0.1", () => {
  log("info", "api.listening", { host: "127.0.0.1", port, workspaceId, computers: service ? "daytona" : "unconfigured", localTokenConfigured: Boolean(process.env.ORBIT_API_TOKEN), autoStopMinutes });
});
