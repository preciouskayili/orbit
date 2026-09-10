import { test } from "node:test";
import assert from "node:assert/strict";
import type { Daytona, Sandbox } from "@daytona/sdk";
import { DaytonaComputers } from "../src/computers/service.js";

function fixture() {
  const calls: unknown[][] = [];
  const record =
    (name: string) =>
    async (...args: unknown[]) => {
      calls.push([name, ...args]);
    };
  const sandbox = {
    labels: {
      "orbit-app": "orbit",
      "orbit-instance": "test",
      "orbit-workspace": "personal",
    },
    state: "started",
    process: {
      executeCommand: async (...args: unknown[]) => {
        calls.push(["terminal", ...args]);
        return { exitCode: 0, result: "/home/daytona" };
      },
    },
    fs: {
      getFileDetails: async () => ({ size: 5, isDir: false }),
      downloadFile: async () => Buffer.from("hello"),
      uploadFile: record("write"),
    },
    computerUse: {
      getStatus: async () => ({ status: "active" }),
      mouse: {
        click: record("click"),
        move: record("move"),
        drag: record("drag"),
        scroll: record("scroll"),
      },
      keyboard: { type: record("type"), press: record("press") },
      screenshot: { takeFullScreen: async () => ({ screenshot: "aGVsbG8=" }) },
    },
  };
  const client = { get: async () => sandbox as unknown as Sandbox } as Pick<
    Daytona,
    "get" | "list" | "create"
  >;
  const service = new DaytonaComputers(client, {
    instanceId: "test",
    workspaceId: "personal",
    image: "test",
    autoStopMinutes: 30,
    vncPort: 6080,
  });
  return { service, sandbox, calls };
}
test("Daytona tool adapter maps desktop actions, captures screenshots, and bounds remote shell execution", async () => {
  const f = fixture();
  let gates = 0;
  const before = async () => {
    gates++;
  };
  const shot = await f.service.execute(
    "computer",
    {
      machineId: "mine",
      action: { type: "click", x: 10, y: 20, button: "left", double: true },
    },
    before,
  );
  assert.deepEqual(f.calls[0], ["click", 10, 20, "left", true]);
  assert.equal(shot.image, "data:image/png;base64,aGVsbG8=");
  await f.service.execute(
    "computer",
    {
      machineId: "mine",
      action: { type: "keypress", key: "l", modifiers: ["ctrl"] },
    },
    before,
  );
  assert.deepEqual(f.calls[1], ["press", "l", ["ctrl"]]);
  await f.service.execute(
    "terminal",
    { machineId: "mine", command: "printf 'hello'" },
    before,
  );
  assert.match(String(f.calls[2]?.[1]), /timeout -k 2s 30s bash/);
  assert.match(String(f.calls[2]?.[1]), /head -c 16000/);
  assert.equal(f.calls[2]?.[4], 40);
  assert.ok(gates >= 5);
  assert.equal(
    (
      await f.service.execute(
        "read_file",
        { machineId: "mine", path: "/tmp/test" },
        before,
      )
    ).text,
    "hello",
  );
});
test("Daytona tools check ownership, running state, and cancellation before provider mutations", async () => {
  const f = fixture();
  const args = { machineId: "mine", command: "pwd" };
  f.sandbox.labels["orbit-instance"] = "foreign";
  await assert.rejects(
    f.service.execute("terminal", args, async () => {}),
    /not found/,
  );
  f.sandbox.labels["orbit-instance"] = "test";
  f.sandbox.state = "stopped";
  await assert.rejects(
    f.service.execute("terminal", args, async () => {}),
    /Start this computer/,
  );
  f.sandbox.state = "started";
  await assert.rejects(
    f.service.execute("terminal", args, async () => {
      throw new Error("cancelled");
    }),
    /cancelled/,
  );
  assert.equal(f.calls.length, 0);
});

test("terminal discovers X11 display and keyboard batches recheck handoff between inputs", async () => {
  const f = fixture();
  await f.service.execute(
    "terminal",
    { machineId: "mine", command: "code" },
    async () => {},
  );
  assert.match(String(f.calls[0]?.[1]), /orbit_display_socket/);
  let gates = 0;
  await assert.rejects(
    f.service.execute(
      "computer_batch",
      {
        machineId: "mine",
        actions: [
          { type: "type", text: "first" },
          { type: "keypress", key: "enter", modifiers: [] },
        ],
      },
      async () => {
        if (++gates === 5) throw new Error("human input");
      },
    ),
    /human input/,
  );
  assert.equal(
    f.calls.some((call) => call[0] === "press"),
    false,
  );
});
