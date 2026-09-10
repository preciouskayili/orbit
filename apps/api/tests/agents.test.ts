import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import type { Response, ResponseInput } from "openai/resources/responses/responses";
import type { StartAgentRun, AgentRun } from "@orbit/shared";
import { AgentRuns, type AgentModel } from "../src/agents/service.js";
import { ComputerError, type ComputerService } from "../src/computers/service.js";
import type { AgentComputerTools } from "../src/agents/tools.js";
import { createApp } from "../src/app.js";

const answer = (text = "Done"): Pick<Response, "output" | "status"> => ({ status: "completed", output: [{ type: "message", id: randomUUID(), role: "assistant", status: "completed", content: [{ type: "output_text", text, annotations: [] }] }] });
const call = (name: string, args: unknown): Pick<Response, "output" | "status"> => ({ status: "completed", output: [{ type: "function_call", name, arguments: JSON.stringify(args), call_id: randomUUID(), id: randomUUID(), status: "completed" }] });
const input = (patch: Partial<StartAgentRun> = {}): StartAgentRun => ({ requestId: randomUUID(), conversationId: randomUUID(), instructions: "Be helpful", skills: ["terminal", "files", "browser"], machineIds: ["mine"], messages: [{ role: "user", content: "Inspect the computer" }], ...patch });
async function until(check: () => boolean) {
  for (let i = 0; i < 150; i++) { if (check()) return; await delay(20); }
  assert.fail("Timed out waiting for agent state");
}
function fixture(responses: ReturnType<typeof answer>[], patch: Partial<AgentComputerTools & ComputerService> = {}) {
  const calls: string[] = [];
  const inputs: ResponseInput[] = [];
  const computers = {
    async get(id: string) { if (id !== "mine") throw new ComputerError(404, "Computer not found in this workspace."); return { id, name: "Desktop", status: "running" }; },
    async execute(name: string, _args: unknown, before: () => Promise<void>) { await before(); calls.push(name); return { text: "Real result", ...(name === "computer" ? { image: "data:image/png;base64,ZmFrZQ==" } : {}) }; },
    ...patch,
  } as ComputerService & AgentComputerTools;
  const model: AgentModel = { async respond(history, _instructions, _tools, _signal, onText) {
    inputs.push(structuredClone(history));
    onText(randomUUID(), "Working…");
    return responses.shift() ?? answer();
  } };
  const service = new AgentRuns(model, computers, 5);
  return { service, computers, calls, inputs, start(value = input()) {
    const run = service.start(value);
    service.control(run.id, { action: "heartbeat", humanMachineIds: [] });
    return run.id;
  } };
}
const done = (run: AgentRun) => ["completed", "failed", "cancelled"].includes(run.status);

test("real tool results and streamed messages are carried into the next model turn; retries are idempotent", async () => {
  const f = fixture([call("terminal", { machineId: "mine", command: "pwd" }), answer("Verified")]);
  const value = input();
  const id = f.start(value);
  assert.equal(f.service.start(value).id, id);
  assert.throws(() => f.service.start({ ...value, instructions: "different" }), /different turn/);
  await until(() => done(f.service.get(id)));
  assert.equal(f.service.get(id).status, "completed");
  assert.deepEqual(f.calls, ["terminal"]);
  assert.ok(f.service.get(id).messages.some((m) => m.content === "Working…"));
  assert.ok(JSON.stringify(f.inputs[1]).includes("Real result"));
  assert.ok(JSON.stringify(f.inputs[1]).includes("function_call_output"));
  assert.equal(f.service.start(value).status, "completed");
  assert.equal(f.calls.length, 1);
});

test("ownership, tool profile, and attached computer checks reject calls before execution", async () => {
  for (const [value, response] of [
    [input({ machineIds: ["foreign"] }), answer()],
    [input({ skills: ["files"] }), call("terminal", { machineId: "mine", command: "pwd" })],
    [input(), call("terminal", { machineId: "foreign", command: "pwd" })],
  ] as const) {
    const f = fixture([response]);
    const id = f.start(value);
    await until(() => done(f.service.get(id)));
    assert.equal(f.service.get(id).status, "failed");
    assert.equal(f.calls.length, 0);
  }
});

test("a missing heartbeat prevents execution; human input waits, and manual pause stays paused", async () => {
  const f = fixture([call("terminal", { machineId: "mine", command: "pwd" }), answer()]);
  const id = f.service.start(input()).id;
  await delay(150);
  assert.equal(f.inputs.length, 0);
  f.service.control(id, { action: "heartbeat", humanMachineIds: ["mine"] });
  await until(() => f.service.get(id).messages.some((m) => m.tool));
  assert.equal(f.calls.length, 0);
  f.service.control(id, { action: "pause" });
  f.service.control(id, { action: "heartbeat", humanMachineIds: [] });
  await delay(150);
  assert.equal(f.calls.length, 0);
  assert.equal(f.service.get(id).status, "paused");
  f.service.control(id, { action: "resume" });
  await until(() => done(f.service.get(id)));
  assert.equal(f.calls.length, 1);
});

test("desktop actions require a fresh screenshot and send image observations back to OpenAI", async () => {
  const f = fixture([
    call("computer", { machineId: "mine", action: { type: "type", text: "unsafe guess" } }),
    call("computer", { machineId: "mine", action: { type: "screenshot" } }),
    call("computer", { machineId: "mine", action: { type: "type", text: "observed" } }), answer(),
  ]);
  const id = f.start();
  await until(() => done(f.service.get(id)));
  assert.deepEqual(f.calls, ["computer", "computer"]);
  assert.ok(f.service.get(id).messages.some((m) => m.tool?.output.includes("fresh screenshot")));
  assert.ok(JSON.stringify(f.inputs).includes("input_image"));
  assert.ok(!JSON.stringify(f.service.get(id)).includes("base64"));
});

test("confirmation awaits an exact approval ID and delivers the user's denial to the model", async () => {
  const f = fixture([call("request_confirmation", { description: "Send this report to example@example.com?" }), answer("I will not send it.")]);
  const id = f.start();
  await until(() => Boolean(f.service.get(id).approval));
  assert.equal(f.inputs.length, 1);
  assert.throws(() => f.service.control(id, { action: "approve", approvalId: "wrong", allow: true }), /no longer pending/);
  f.service.control(id, { action: "approve", approvalId: f.service.get(id).approval!.id, allow: false });
  await until(() => done(f.service.get(id)));
  assert.ok(JSON.stringify(f.inputs[1]).includes("user denied"));
  assert.equal(f.service.get(id).approval, undefined);
});

test("cancelling keeps a computer reserved until an in-flight tool finishes and prevents further model turns", async () => {
  let release!: () => void;
  let entered = false;
  const f = fixture([call("terminal", { machineId: "mine", command: "sleep 1" })], {
    async execute() { entered = true; await new Promise<void>((resolve) => { release = resolve; }); return { text: "Completed before cancellation" }; },
  });
  const id = f.start();
  await until(() => entered);
  f.service.control(id, { action: "cancel" });
  assert.throws(() => f.start(), /another agent run/);
  release();
  await until(() => done(f.service.get(id)));
  assert.equal(f.service.get(id).status, "cancelled");
  assert.equal(f.inputs.length, 1);
  const next = f.start(input({ machineIds: [] }));
  await until(() => done(f.service.get(next)));
});

test("API run and control endpoints require authentication, enforce workspace scope and report configuration errors", async () => {
  const f = fixture([answer()]);
  const app = createApp({ service: f.computers, agents: f.service, token: "test-token", workspaceId: "personal" });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/workspaces/`;
  const headers = { Authorization: "Bearer test-token", "Content-Type": "application/json" };
  try {
    assert.equal((await fetch(base + "personal/agent-runs", { method: "POST" })).status, 401);
    assert.equal((await fetch(base + "team/agent-runs/nope", { headers })).status, 403);
    assert.equal((await fetch(base + "personal/agent-runs", { method: "POST", headers, body: "{}" })).status, 400);
    const response = await fetch(base + "personal/agent-runs", { method: "POST", headers, body: JSON.stringify(input({ machineIds: [] })) });
    assert.equal(response.status, 201);
    const run = await response.json() as AgentRun;
    assert.equal((await fetch(base + "personal/agent-runs/" + run.id)).status, 401);
    await fetch(base + "personal/agent-runs/" + run.id, { method: "POST", headers, body: JSON.stringify({ action: "cancel" }) });
    await until(() => done(f.service.get(run.id)));
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("OpenAI SDK sends strict computer function tools and consumes streaming text/completion events", async () => {
  const { OpenAIAgentModel } = await import("../src/agents/service.js");
  const { agentTools } = await import("../src/agents/tools.js");
  let sent: any;
  const model = new OpenAIAgentModel("test-key", "test-model", { fetch: async (_url, options) => {
    sent = JSON.parse(String(options?.body));
    const response = answer("stream complete");
    const events = [
      { type: "response.output_text.delta", item_id: "message", delta: "stream " },
      { type: "response.output_text.delta", item_id: "message", delta: "complete" },
      { type: "response.completed", response },
    ];
    return new globalThis.Response(events.map((data) => `event: ${data.type}\ndata: ${JSON.stringify(data)}\n\n`).join(""), { headers: { "Content-Type": "text/event-stream" } });
  } });
  let text = "";
  const response = await model.respond([{ role: "user", content: "Hello" }], "Instructions", agentTools(["browser"], true), new AbortController().signal, (_id, delta) => { text += delta; });
  assert.equal(text, "stream complete");
  assert.equal(response.status, "completed");
  assert.equal(sent.stream, true);
  assert.equal(sent.store, false);
  assert.equal(sent.parallel_tool_calls, false);
  assert.deepEqual(sent.include, ["reasoning.encrypted_content"]);
  assert.deepEqual(sent.tools.map((t: { name: string }) => t.name), ["computer", "request_confirmation"]);
  for (const tool of sent.tools) { assert.equal(tool.strict, true); assert.equal(tool.parameters.additionalProperties, false); }
  const desktopTool = sent.tools.find((tool: { name: string }) => tool.name === "computer");
  assert.ok(desktopTool.parameters.properties.action.anyOf);
  assert.equal(JSON.stringify(desktopTool.parameters).includes('"oneOf"'), false);
});

test("agents can operate on multiple computers within the same run, reserving all attached machines", async () => {
  const machines = ["comp-1", "comp-2"];
  const toolTargetMachines: string[] = [];
  const f = fixture(
    [
      call("terminal", { machineId: "comp-1", command: "npm test" }),
      call("computer", { machineId: "comp-2", action: { type: "screenshot" } }),
      answer("Both computers verified"),
    ],
    {
      async get(id: string) {
        if (!machines.includes(id)) throw new ComputerError(404, "Not found");
        return { id, name: id === "comp-1" ? "Build Box" : "QA Desktop", status: "running" as const };
      },
      async execute(name: string, args: unknown, before: () => Promise<void>) {
        await before();
        toolTargetMachines.push((args as { machineId: string }).machineId);
        return {
          text: `OK from ${(args as { machineId: string }).machineId}`,
          ...(name === "computer" ? { image: "data:image/png;base64,ZmFrZQ==" } : {}),
        };
      },
    },
  );
  const runInput = input({ machineIds: machines });
  const id = f.start(runInput);

  // While active, neither comp-1 nor comp-2 can be reserved by another agent run
  assert.throws(() => f.service.start(input({ machineIds: ["comp-1"] })), /A computer is being used/);
  assert.throws(() => f.service.start(input({ machineIds: ["comp-2"] })), /A computer is being used/);

  await until(() => done(f.service.get(id)));
  assert.equal(f.service.get(id).status, "completed");
  assert.deepEqual(toolTargetMachines, ["comp-1", "comp-2"]);

  // After completion, reservations are freed for both machines
  const next1 = f.start(input({ machineIds: ["comp-1"] }));
  await until(() => done(f.service.get(next1)));
  const next2 = f.start(input({ machineIds: ["comp-2"] }));
  await until(() => done(f.service.get(next2)));
});
