import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona } from "@daytona/sdk";
import { DaytonaComputers } from "../src/computers/service.js";

async function main() {
const id = process.argv[2];
if (!id) throw new Error("Pass the ID of an existing test computer.");
const service = new DaytonaComputers(new Daytona({ requestTimeoutMs: 30_000 }), {
  workspaceId: process.env.ORBIT_WORKSPACE_ID || "personal",
  instanceId: readFileSync(resolve(process.env.ORBIT_DATA_DIR || ".data", "instance-id"), "utf8").trim(),
  image: process.env.DAYTONA_DESKTOP_IMAGE || "daytonaio/sandbox:0.6.0", autoStopMinutes: 30, vncPort: 6080,
});
const machine = await service.get(id);
if (!["running", "stopped"].includes(machine.status)) throw new Error("The test computer must be running or stopped.");
try {
  if (machine.status === "stopped") await service.status(id, "start");
  const before = async () => {};
  const terminal = await service.execute("terminal", { machineId: id, command: "uname -s" }, before);
  assert.match(terminal.text, /Exit code: 0\nLinux/);
  const file = await service.execute("read_file", { machineId: id, path: "/etc/os-release" }, before);
  assert.match(file.text, /NAME=/);
  const screen = await service.execute("computer", { machineId: id, action: { type: "screenshot" } }, before);
  assert.ok(screen.image?.startsWith("data:image/png;base64,"));
  const bytes = Buffer.from(screen.image!.split(",")[1]!, "base64");
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  console.log("PASS: real Daytona terminal, file reading, and PNG screenshot. No files or UI were modified.");
} finally {
  if (machine.status === "stopped") await service.status(id, "stop");
}

}
void main().catch(() => {
  console.error("Computer tool check failed. Check the Daytona connection and DNS. Cleanup was attempted; verify the computer is stopped.");
  process.exitCode = 1;
});
