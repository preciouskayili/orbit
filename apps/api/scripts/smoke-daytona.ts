// Explicit live smoke test: creates ONE billable computer and leaves it stopped.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { Daytona } from "@daytona/sdk";

const base = `http://127.0.0.1:${process.env.API_PORT || 4000}/api/workspaces/${process.env.ORBIT_WORKSPACE_ID || "personal"}/computers`;
async function call(path = "", body?: unknown) {
  const response = await fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + process.env.ORBIT_API_TOKEN, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(240_000),
  });
  const result = await response.json() as { id: string; url: string; message?: string };
  if (!response.ok) throw new Error(result.message || `HTTP ${response.status}`);
  return result;
}
let id: string | undefined;
let requestId: string;
try { requestId = (JSON.parse(await readFile("/tmp/orbit-daytona-smoke-request.json", "utf8")) as { requestId: string }).requestId; }
catch { requestId = randomUUID(); await writeFile("/tmp/orbit-daytona-smoke-request.json", JSON.stringify({ requestId })); }
try {
  const computer = await call("", { name: "Orbit integration test", os: "ubuntu", cpu: 2, ramGb: 4, storageGb: 10, requestId });
  id = computer.id;
  console.log("Created integration-test computer:", id);
  await writeFile("/tmp/orbit-daytona-smoke.json", JSON.stringify({ id }), { mode: 0o600 });
  const daytona = new Daytona();
  let sandbox = await daytona.get(id);
  const path = "/home/daytona/.orbit-persistence-" + randomUUID();
  const content = "Orbit persistence smoke test";
  await sandbox.fs.uploadFile(Buffer.from(content), path);
  await call(`/${id}/stop`, {});
  console.log("Stopped computer after writing a test file.");
  await call(`/${id}/start`, {});
  sandbox = await daytona.get(id);
  const restored = await sandbox.fs.downloadFile(path);
  if (restored.toString() !== content) throw new Error("Persistence verification failed.");
  console.log("Restarted computer; test file survived.");
  const session = await call(`/${id}/desktop`, {});
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(session.url);
    const timeout = setTimeout(() => { socket.close(); reject(new Error("Desktop handshake timed out.")); }, 20_000);
    socket.onmessage = async (event) => {
      clearTimeout(timeout);
      const bytes = event.data instanceof Blob ? Buffer.from(await event.data.arrayBuffer()) : Buffer.from(event.data);
      socket.close();
      if (bytes.toString().startsWith("RFB ")) resolve();
      else reject(new Error("Invalid desktop handshake."));
    };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error("Desktop WebSocket connection failed.")); };
  });
  console.log("Desktop WebSocket handshake succeeded.");
  const screenshot = await sandbox.computerUse.screenshot.takeFullScreen();
  console.log("Live screenshot received:", Boolean(screenshot));
  // Optional brief window for a manual desktop check before the final stop.
  if (process.env.ORBIT_SMOKE_VIEW_SECONDS) await new Promise((resolve) => setTimeout(resolve, Math.min(60, Number(process.env.ORBIT_SMOKE_VIEW_SECONDS)) * 1000));
  await sandbox.fs.deleteFile(path);
  console.log("Live smoke test passed.");
} catch (error) {
  // SDK errors can contain credentials; do not print raw exception objects.
  console.error("Live smoke test failed:", error instanceof Error ? error.name === "Error" ? error.message : `${error.name} (${(error as { cause?: { code?: string } }).cause?.code ?? "provider error"})` : "Provider request failed; inspect account status.");
  process.exitCode = 1;
} finally {
  if (id) {
    try { const sandbox = await new Daytona({ requestTimeoutMs: 30_000 }).get(id);
      if (sandbox.state !== "stopped") await sandbox.stop(120);
      console.log("Integration-test computer left STOPPED."); }
    catch { console.error("Could not stop the test computer. Stop it in your Daytona dashboard:", id); process.exitCode = 1; }
  }
}
