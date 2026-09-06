import { log, errorFields } from "../logger.js";
import { Daytona, type Sandbox } from "@daytona/sdk";
import { MachineSchema, type Machine, type CreateMachineInput } from "@orbit/shared";

export class ComputerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface ComputerService {
  list(): Promise<Machine[]>;
  create(input: CreateMachineInput, requestId: string): Promise<Machine>;
  get(id: string): Promise<Machine>;
  rename(id: string, name: string): Promise<Machine>;
  status(id: string, action: "start" | "stop"): Promise<Machine>;
  desktop(id: string): Promise<{ url: string; expiresAt: string }>;
}
export interface DaytonaOptions {
  workspaceId: string;
  instanceId: string;
  image: string;
  autoStopMinutes: number;
  vncPort: number;
}

// Daytona labels are the durable computer registry; a localStorage record never
// grants ownership. Every lookup verifies this installation and workspace.
export class DaytonaComputers implements ComputerService {
  private locks = new Map<string, Promise<unknown>>();
  constructor(private client: Pick<Daytona, "list" | "get" | "create">, private options: DaytonaOptions) {}
  private labels() {
    return { "orbit-app": "orbit", "orbit-instance": this.options.instanceId, "orbit-workspace": this.options.workspaceId };
  }
  private async owned(id: string) {
    const sandbox = await this.client.get(id);
    if (!Object.entries(this.labels()).every(([key, value]) => sandbox.labels[key] === value)) {
      throw new ComputerError(404, "Computer not found in this workspace.");
    }
    return sandbox;
  }
  private machine(sandbox: Sandbox): Machine {
    const status = sandbox.state === "started" ? "running"
      : ["stopped", "archived"].includes(sandbox.state ?? "") ? "stopped"
      : ["stopping", "archiving"].includes(sandbox.state ?? "") ? "stopping"
      : ["creating", "starting", "restoring", "building", "pending_build"].includes(sandbox.state ?? "") ? "starting"
      : "error";
    return MachineSchema.parse({
      id: sandbox.id, workspaceId: this.options.workspaceId, projectId: "",
      provider: "daytona", name: sandbox.labels["orbit-name"] || sandbox.name,
      os: "ubuntu", osLabel: "Linux · Daytona", status,
      cpu: sandbox.cpu, ramGb: sandbox.memory, storageGb: sandbox.disk,
      lastSeenAt: new Date().toISOString(),
    });
  }
  private async exclusive<T>(key: string, action: string, operation: () => Promise<T>): Promise<T> {
    if (this.locks.has(key)) throw new ComputerError(409, "A computer operation is already in progress. Wait for it to finish.");
    const started = performance.now();
    log("info", "computer.operation.started", { action, computerKey: key });
    const task = operation();
    this.locks.set(key, task);
    try {
      const result = await task;
      log("info", "computer.operation.finished", { action, computerKey: key, durationMs: Math.round(performance.now() - started) });
      return result;
    } catch (error) {
      log("error", "computer.operation.failed", { action, computerKey: key, durationMs: Math.round(performance.now() - started), ...errorFields(error) });
      throw error;
    } finally { this.locks.delete(key); }
  }
  async list() {
    const machines: Machine[] = [];
    for await (const sandbox of this.client.list({ labels: this.labels() })) machines.push(this.machine(sandbox));
    log("debug", "computers.refreshed", { workspaceId: this.options.workspaceId, count: machines.length });
    return machines;
  }
  async get(id: string) { return this.machine(await this.owned(id)); }
  async create(input: CreateMachineInput, requestId: string) {
    return this.exclusive("create:" + requestId, "create", async () => {
      // A retry after a lost response finds the original machine, including
      // after restarting Orbit's API. The provider name also enforces uniqueness.
      for await (const existing of this.client.list({ labels: { ...this.labels(), "orbit-request": requestId } })) {
        log("info", "computer.creation.reused", { computerId: existing.id, requestId });
        return this.machine(existing);
      }
      const sandbox = await this.client.create({
        name: "orbit-" + requestId,
        image: this.options.image,
        resources: { cpu: input.cpu, memory: input.ramGb, disk: input.storageGb },
        labels: { ...this.labels(), "orbit-name": input.name, "orbit-request": requestId },
        envVars: { VNC_RESOLUTION: "1440x900" },
        public: false, ephemeral: false, autoDeleteInterval: -1,
        autoStopInterval: this.options.autoStopMinutes,
      }, { timeout: 180 });
      log("info", "computer.created", { computerId: sandbox.id, cpu: sandbox.cpu, memoryGb: sandbox.memory, diskGb: sandbox.disk });
      return this.machine(sandbox);
    });
  }
  async rename(id: string, name: string) {
    return this.exclusive(id, "rename", async () => {
      const sandbox = await this.owned(id);
      await sandbox.setLabels({ ...sandbox.labels, "orbit-name": name });
      await sandbox.refreshData();
      return this.machine(sandbox);
    });
  }
  async status(id: string, action: "start" | "stop") {
    return this.exclusive(id, action, async () => {
      const sandbox = await this.owned(id);
      if (action === "start" && sandbox.state !== "started") await sandbox.start(120);
      if (action === "stop" && sandbox.state !== "stopped" && sandbox.state !== "archived") await sandbox.stop(120);
      await sandbox.refreshData();
      return this.machine(sandbox);
    });
  }
  async desktop(id: string) {
    return this.exclusive(id, "desktop.connect", async () => {
      const sandbox = await this.owned(id);
      if (sandbox.state !== "started") throw new ComputerError(409, "Start this computer before connecting.");
      if ((await sandbox.computerUse.getStatus()).status !== "active") await sandbox.computerUse.start();
      const sessionSeconds = 15 * 60;
      const preview = await sandbox.getSignedPreviewUrl(this.options.vncPort, sessionSeconds);
      const url = new URL(preview.url);
      if (url.protocol !== "https:") throw new ComputerError(502, "The provider returned an invalid desktop address.");
      url.protocol = "wss:";
      url.pathname = url.pathname.replace(/\/$/, "") + "/websockify";
      return { url: url.href, expiresAt: new Date(Date.now() + sessionSeconds * 1000).toISOString() };
    });
  }
}
