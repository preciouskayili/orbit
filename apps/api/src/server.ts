import { IntegrationStore } from "./integrations/store.js";
import { ModelRegistry } from "./agents/models.js";
import { RunJournal } from "./agents/journal.js";
import { log } from "./logger.js";
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona } from "@daytona/sdk";
import { createApp } from "./app.js";
import { DaytonaComputers, ComputerError } from "./computers/service.js";
import { AgentRuns } from "./agents/service.js";

async function main() {
const port = Number(process.env.API_PORT ?? 4000);
const workspaceId = process.env.ORBIT_WORKSPACE_ID || "personal";
const directory = resolve(process.env.ORBIT_DATA_DIR || ".data");

mkdirSync(directory, { recursive: true });

const instanceFile = resolve(directory, "instance-id");

try {
  writeFileSync(instanceFile, randomUUID(), { flag: "wx", mode: 0o600 });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
}

const instanceId = readFileSync(instanceFile, "utf8").trim();
const autoStopMinutes = Number(process.env.DAYTONA_AUTO_STOP_MINUTES ?? 30);
const vncPort = Number(process.env.DAYTONA_VNC_PORT ?? 6080);

if (!Number.isInteger(autoStopMinutes) || autoStopMinutes < 0)
  throw new Error("DAYTONA_AUTO_STOP_MINUTES must be a nonnegative integer.");

if (!Number.isInteger(vncPort) || vncPort < 1 || vncPort > 65535)
  throw new Error("Invalid DAYTONA_VNC_PORT.");

const integrations = new IntegrationStore(directory);
const makeComputers = (key: string) => new DaytonaComputers(new Daytona({ apiKey: key, requestTimeoutMs: 30_000 }), { workspaceId, instanceId, autoStopMinutes, vncPort, image: process.env.DAYTONA_DESKTOP_IMAGE || 'daytonaio/sandbox:0.6.0' });
const daytonaKey = integrations.data.daytonaKey ?? process.env.DAYTONA_API_KEY;
let configuredService = daytonaKey ? makeComputers(daytonaKey) : undefined;
const service = new Proxy({} as DaytonaComputers, { get(_target, prop) {
  if (!configuredService) return async () => { throw new ComputerError(503, 'Connect Daytona in Settings to use computers.'); };
  const value = Reflect.get(configuredService, prop);
  return typeof value === 'function' ? value.bind(configuredService) : value;
} });
const models = new ModelRegistry({ openai: integrations.data.providers.openai ?? process.env.OPENAI_API_KEY, anthropic: integrations.data.providers.anthropic ?? process.env.ANTHROPIC_API_KEY }, process.env.OPENAI_MODEL);
await models.refresh();
const agents = new AgentRuns(models, service, 32, new RunJournal(resolve(directory, 'runs')), integrations);
const computerConfig = { configured: () => Boolean(configuredService), configure: async (key: string) => {
  if (agents.hasActiveRuns()) throw new ComputerError(409, 'Stop active agents before changing the computer provider.');
  const candidate = makeComputers(key);
  try { await candidate.list(); } catch { throw new ComputerError(400, 'Could not connect to Daytona. Check the API key and network.'); }
  if (agents.hasActiveRuns()) throw new ComputerError(409, 'Stop active agents before changing the computer provider.');
  configuredService = candidate;
} };

const app = createApp({
  service,
  agents,
  integrations,
  models,
  computerConfig,
  token: process.env.ORBIT_API_TOKEN,
  workspaceId,
});

app.listen(port, "127.0.0.1", () => {
  log("info", "api.listening", {
    host: "127.0.0.1",
    port,
    workspaceId,
    computers: service ? "daytona" : "unconfigured",
    localTokenConfigured: Boolean(process.env.ORBIT_API_TOKEN),
    autoStopMinutes,
  });
});

}
void main().catch(() => { log("error", "api.start.failed", { message: "Could not initialize the local API. Check configuration and data directory permissions." }); process.exitCode = 1; });
