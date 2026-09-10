import "dotenv/config";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { AgentRunSchema, MachinesResponseSchema } from "@orbit/shared";

const base = `http://127.0.0.1:${process.env.API_PORT || 4000}/api/workspaces/${encodeURIComponent(process.env.ORBIT_WORKSPACE_ID || "personal")}`;
const headers = { Authorization: "Bearer " + process.env.ORBIT_API_TOKEN, "Content-Type": "application/json" };
async function request(path: string, body?: unknown) {
  const response = await fetch(base + path, { method: body ? "POST" : "GET", headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(path.startsWith("/computers/") ? 150_000 : 20_000) });
  if (!response.ok) {
    const result = await response.json() as { message?: string };
    throw new Error(result.message || `API returned ${response.status}`);
  }
  return response.json();
}
const machines = MachinesResponseSchema.parse(await request("/computers"));
const requestedId = process.argv[2];
const startStopped = process.argv.includes("--start");
const candidates = machines.filter((m) => (m.status === "running" || (startStopped && m.status === "stopped")) && (!requestedId || m.id === requestedId));
if (candidates.length !== 1) throw new Error("Pass the ID of one running computer: tsx scripts/smoke-agent.ts <computer-id>");
const machine = candidates[0]!;
const requestId = randomUUID();
const interactive = process.argv.includes("--interactive");
const notePath = `/tmp/orbit-agent-test-${requestId}.txt`;
const marker = `Desktop edit verified ${requestId}`;
let finished = false;
try {
  if (machine.status === "stopped") {
    console.log("Starting the existing test computer; it will be stopped after the check.");
    await request(`/computers/${encodeURIComponent(machine.id)}/start`, {});
  }
  let run = AgentRunSchema.parse(await request("/agent-runs", {
    requestId, conversationId: "smoke-" + requestId, instructions: interactive
      ? "Perform only the requested test on the specified temporary file. Do not alter existing user files or settings. Leave the text editor open so the user can inspect the result."
      : "Perform only the specific read-only checks requested. Do not modify files, click, type, or navigate.",
    skills: ["terminal", "browser", "files"], machineIds: [machine.id],
    messages: [{ role: "user", content: interactive
      ? `Test the attached computer ${machine.id}. Use write_file to create ${notePath} containing "Orbit agent test" and a newline. Use terminal to launch an installed graphical text editor (such as mousepad) opening that file on the existing X11 display. Launch it detached so the command returns. Take a screenshot with computer. Using computer keyboard actions, append a new line exactly "${marker}" and save through the editor. Then use read_file to verify the saved file contains that exact line. Do not use terminal or write_file to append the marker: this tests actual GUI typing and saving. Take a final screenshot and leave the editor visible. You are authorized to create and edit this specific test file.`
      : `On attached computer ${machine.id}, use terminal to run pwd and uname -s. Read /etc/os-release with read_file. Take a screenshot using computer with action screenshot, without interacting with the desktop. Summarize the operating system and whether the screenshot was obtained. Do not modify anything.` }],
  }));
  const deadline = Date.now() + 180_000;
  let lastStatus = "";
  while (!["completed", "failed", "cancelled"].includes(run.status)) {
    if (Date.now() > deadline) throw new Error("Live agent check exceeded three minutes.");
    const status = run.status + ":" + run.messages.length;
    if (status !== lastStatus) { console.log(`Agent ${run.status}; ${run.messages.length} events`); lastStatus = status; }
    await delay(600);
    run = AgentRunSchema.parse(await request("/agent-runs/" + requestId, { action: "heartbeat", humanMachineIds: [] }));
    if (run.approval) throw new Error("The smoke check unexpectedly requested confirmation.");
  }
  finished = true;
  if (run.status !== "completed") throw new Error(run.error || "Agent did not complete.");
  const tools = run.messages.flatMap((m) => m.tool ? [m.tool] : []);
  for (const name of ["terminal", "files", "computer"]) {
    if (!tools.some((tool) => tool.name === name && tool.status === "completed")) throw new Error(`Agent did not verify ${name}.`);
  }
  if (interactive) {
    const typed = tools.findIndex((tool) => tool.name === "computer" && tool.status === "completed" && JSON.parse(tool.input).action.type === "type");
    if (typed < 0 || !tools.slice(typed + 1).some((tool) => tool.name === "files" && tool.status === "completed" && tool.output.includes(marker))) {
      throw new Error("The agent did not verify a persisted GUI edit.");
    }
    console.log(`PASS: OpenAI created a file, edited it through the desktop, saved it, and read back the result. Test file: ${notePath}`);
  } else console.log("PASS: OpenAI completed terminal, file reading, and a desktop screenshot on the existing computer.");
} finally {
  if (!finished) await request("/agent-runs/" + requestId, { action: "cancel" }).catch(() => {});
  if (machine.status === "stopped") await request(`/computers/${encodeURIComponent(machine.id)}/stop`, {});
}
