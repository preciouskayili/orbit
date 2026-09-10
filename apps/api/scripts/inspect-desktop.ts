import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Daytona } from "@daytona/sdk";
import { DaytonaComputers } from "../src/computers/service.js";
async function main() {
  const id = process.argv[2];
  if (!id) throw new Error("Pass a computer ID.");
  const service = new DaytonaComputers(new Daytona({ requestTimeoutMs: 30000 }), {
    workspaceId: process.env.ORBIT_WORKSPACE_ID || "personal",
    instanceId: readFileSync(resolve(process.env.ORBIT_DATA_DIR || ".data", "instance-id"), "utf8").trim(),
    image: process.env.DAYTONA_DESKTOP_IMAGE || "daytonaio/sandbox:0.6.0", autoStopMinutes: 30, vncPort: 6080,
  });
  const machine = await service.get(id);
  if (machine.status === "stopped") await service.status(id, "start");
  const before = async () => {};
  console.log((await service.execute("read_file", { machineId: id, path: "/etc/os-release" }, before)).text);
  console.log((await service.execute("terminal", { machineId: id, command: "dpkg-query -W xfce4-session xfwm4 adwaita-icon-theme greybird-gtk-theme 2>/dev/null" }, before)).text);
  const screenshot = await service.execute("computer", { machineId: id, action: { type: "screenshot" } }, before);
  writeFileSync("/tmp/orbit-desktop-inspection.png", Buffer.from(screenshot.image!.split(",")[1]!, "base64"), { mode: 0o600 });
  console.log("Screenshot saved to /tmp/orbit-desktop-inspection.png. Computer left running for manual testing.");
}
void main().catch(() => { console.error("Desktop inspection failed. Check the computer connection."); process.exitCode = 1; });
