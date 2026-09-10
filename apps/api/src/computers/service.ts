import { setTimeout as delay } from "node:timers/promises";
import { log, errorFields } from "../logger.js";
import { Daytona, type Sandbox } from "@daytona/sdk";
import { MachineSchema, type Machine, type CreateMachineInput } from "@orbit/shared";
import { toolSchemas, type AgentComputerTools } from "../agents/tools.js";

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
export class DaytonaComputers implements ComputerService, AgentComputerTools {
  private desktopStarts = new Map<string, Promise<void>>();
  private async ensureDesktop(sandbox: Sandbox, beforeAction: () => Promise<void> = async () => {}) {
    const pending = this.desktopStarts.get(sandbox.id);
    if (pending) { await pending; await beforeAction(); return; }
    const ready = (async () => {
      if ((await sandbox.computerUse.getStatus()).status === 'active') return;
      await beforeAction();
      try { await sandbox.computerUse.start(); }
      catch (error) {
        // A provider timeout can arrive after the desktop has actually started.
        // Re-observe readiness instead of asking the model to repeat startup.
        if ((await sandbox.computerUse.getStatus()).status !== 'active') throw error;
      }
    })();
    this.desktopStarts.set(sandbox.id, ready);
    try { await ready; } finally { this.desktopStarts.delete(sandbox.id); }
    await beforeAction();
  }
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
    const os = (sandbox.labels["orbit-os"] as Machine["os"]) ||
      ((sandbox as unknown as { sandboxClass?: string }).sandboxClass === "windows" ? "windows" : "ubuntu");
    const osLabel = os === "windows" ? "Windows · Daytona"
      : os === "macos" ? "macOS · Daytona"
      : "Linux · Daytona";
    return MachineSchema.parse({
      id: sandbox.id, workspaceId: this.options.workspaceId, projectId: "",
      provider: "daytona", name: sandbox.labels["orbit-name"] || sandbox.name,
      os, osLabel, status,
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
  async execute(name: Parameters<AgentComputerTools["execute"]>[0], args: unknown, beforeAction: () => Promise<void>) {
    const parsed = toolSchemas[name].parse(args);
    const sandbox = await this.owned(parsed.machineId);
    if (sandbox.state !== "started") throw new ComputerError(409, "Start this computer before using agent tools.");
    // Recheck cancellation and human input after the provider lookup, directly
    // before each operation. An already dispatched provider action can finish.
    await beforeAction();
    if (name === "terminal") {
      const { command } = toolSchemas.terminal.parse(args);
      const isWindows = sandbox.labels["orbit-os"] === "windows" || (sandbox as unknown as { sandboxClass?: string }).sandboxClass === "windows";
      if (isWindows) {
        const quote = (value: string) => "'" + value.replace(/'/g, "''") + "'";
        const bounded = `$ProgressPreference = 'SilentlyContinue'; ${command} | Out-String -Width 160`;
        const result = await sandbox.process.executeCommand(`powershell -NoProfile -NonInteractive -Command ${quote(bounded)}`, undefined, undefined, 40);
        return { text: `Exit code: ${result.exitCode}\n${result.result.slice(0, 16000)}` };
      }
      const quote = (value: string) => "'" + value.replace(/'/g, "'\\''") + "'";
      // Enforce the deadline inside the computer, even if the API disconnects.
      const desktopEnvironment = 'if [ -z "${DISPLAY:-}" ]; then for orbit_display_socket in /tmp/.X11-unix/X*; do if [ -S "$orbit_display_socket" ]; then export DISPLAY=":${orbit_display_socket##*/X}"; break; fi; done; fi; ';
      const bounded = "timeout -k 2s 30s bash -lc " + quote(desktopEnvironment + command) + " 2>&1 | head -c 16000";
      const result = await sandbox.process.executeCommand("bash -o pipefail -c " + quote(bounded), undefined, undefined, 40);
      return { text: `Exit code: ${result.exitCode}\n${result.result.slice(0, 16000)}` };
    }
    if (name === "read_file") {
      const { path } = toolSchemas.read_file.parse(args);
      const info = await sandbox.fs.getFileDetails(path);
      if (info.isDir || info.size > 64000) throw new ComputerError(400, "Choose a text file no larger than 64 KB.");
      await beforeAction();
      const content = await sandbox.fs.downloadFile(path, 20);
      return { text: content.subarray(0, 64000).toString("utf8") };
    }
    if (name === "write_file") {
      const { path, content } = toolSchemas.write_file.parse(args);
      await sandbox.fs.uploadFile(Buffer.from(content), path, 20);
      return { text: `Wrote ${Buffer.byteLength(content)} bytes to ${path}.` };
    }
    const actions = name === "computer_batch" ? toolSchemas.computer_batch.parse(args).actions : [toolSchemas.computer.parse(args).action];
    const desktop = sandbox.computerUse;
    await this.ensureDesktop(sandbox, beforeAction);
    await beforeAction();
    for (const action of actions) {
    await beforeAction();
    switch (action.type) {
      case "click": await desktop.mouse.click(action.x, action.y, action.button, action.double); break;
      case "move": await desktop.mouse.move(action.x, action.y); break;
      case "drag": await desktop.mouse.drag(action.x, action.y, action.endX, action.endY); break;
      case "scroll": await desktop.mouse.scroll(action.x, action.y, action.direction, action.amount); break;
      case "type": await desktop.keyboard.type(action.text); break;
      case "keypress": await desktop.keyboard.press(action.key, action.modifiers); break;
      case "wait":
        for (let waited = 0; waited < action.milliseconds; waited += 100) { await delay(Math.min(100, action.milliseconds - waited)); await beforeAction(); }
        break;
      case "screenshot": break;
    }
    }
    if (actions.some(a => !["screenshot", "wait"].includes(a.type))) { await delay(300); await beforeAction(); }
    const screenshot = await desktop.screenshot.takeFullScreen();
    if (!screenshot.screenshot) throw new ComputerError(502, "The desktop returned no screenshot.");
    const raw = screenshot.screenshot.replace(/^data:image\/png;base64,/, "");
    if (raw.length > 12_000_000 || !/^[A-Za-z0-9+/=\s]+$/.test(raw)) throw new ComputerError(502, "Invalid desktop screenshot.");
    return { text: `Computer ${parsed.machineId}: ${actions.map(a => a.type).join(", ")} completed. Current screen attached.`, image: "data:image/png;base64," + raw };
  }
  async create(input: CreateMachineInput, requestId: string) {
    return this.exclusive("create:" + requestId, "create", async () => {
      // A retry after a lost response finds the original machine, including
      // after restarting Orbit's API. The provider name also enforces uniqueness.
      for await (const existing of this.client.list({ labels: { ...this.labels(), "orbit-request": requestId } })) {
        log("info", "computer.creation.reused", { computerId: existing.id, requestId });
        return this.machine(existing);
      }
      let sandbox: Sandbox;
      const baseLabels = { ...this.labels(), "orbit-name": input.name, "orbit-os": input.os, "orbit-request": requestId };
      try {
        if (input.os === "windows") {
          const snapshot = process.env.DAYTONA_WINDOWS_SNAPSHOT || (
            input.cpu <= 1 && input.ramGb <= 4 ? "windows-small" :
            input.cpu <= 2 && input.ramGb <= 8 ? "windows-medium" :
            input.cpu <= 4 && input.ramGb <= 16 ? "windows-large" : "windows-xlarge"
          );
          sandbox = await this.client.create({
            name: "orbit-" + requestId,
            snapshot,
            labels: baseLabels,
            public: false, ephemeral: false, autoDeleteInterval: -1,
            autoStopInterval: this.options.autoStopMinutes,
          }, { timeout: 180 });
        } else if (input.os === "macos") {
          const snapshot = process.env.DAYTONA_MACOS_SNAPSHOT;
          if (!snapshot) {
            throw new ComputerError(400, "macOS sandboxes require Daytona early access. Sign up at daytona.io and configure DAYTONA_MACOS_SNAPSHOT in apps/api/.env.");
          }
          sandbox = await this.client.create({
            name: "orbit-" + requestId,
            snapshot,
            labels: baseLabels,
            public: false, ephemeral: false, autoDeleteInterval: -1,
            autoStopInterval: this.options.autoStopMinutes,
          }, { timeout: 180 });
        } else {
          sandbox = await this.client.create({
            name: "orbit-" + requestId,
            image: this.options.image,
            resources: { cpu: input.cpu, memory: input.ramGb, disk: input.storageGb },
            labels: baseLabels,
            envVars: { VNC_RESOLUTION: "1440x900" },
            public: false, ephemeral: false, autoDeleteInterval: -1,
            autoStopInterval: this.options.autoStopMinutes,
          }, { timeout: 180 });
        }
      } catch (error: unknown) {
        if (error instanceof ComputerError) throw error;
        const msg = (error as Error)?.message || "";
        if (msg.includes("Tier 1 and Tier 2") || msg.includes("support@daytona.io")) {
          throw new ComputerError(403, "Windows sandboxes are restricted to Daytona Tier 3+ organizations. Contact support@daytona.io to request access.");
        }
        if (msg.includes("not available in region")) {
          throw new ComputerError(400, "Windows snapshots are hosted in Daytona region 'us'. Set DAYTONA_TARGET=us in apps/api/.env and restart the API.");
        }
        throw error;
      }
      log("info", "computer.created", { computerId: sandbox.id, os: input.os, cpu: sandbox.cpu, memoryGb: sandbox.memory, diskGb: sandbox.disk });
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
      await this.ensureDesktop(sandbox);
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
