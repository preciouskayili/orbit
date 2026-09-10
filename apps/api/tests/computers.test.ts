import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Daytona, Sandbox } from "@daytona/sdk";
import { DaytonaComputers } from "../src/computers/service.js";
import { createApp } from "../src/app.js";

function fixture() {
  const data = new Map<string, Sandbox>();
  let creates = 0;
  let desktopStarts = 0;
  const client = {
    async *list({ labels }: { labels?: Record<string, string> } = {}) {
      for (const sandbox of data.values())
        if (
          Object.entries(labels ?? {}).every(
            ([k, v]) => sandbox.labels[k] === v,
          )
        )
          yield sandbox;
    },
    async get(id: string) {
      const value = data.get(id);
      if (!value) throw Object.assign(new Error(), { statusCode: 404 });
      return value;
    },
    async create(params: any) {
      creates++;
      assert.equal(params.public, false);
      assert.equal(params.autoDeleteInterval, -1);
      const sandbox = {
        id: randomUUID(),
        name: params.name,
        labels: params.labels,
        cpu: params.resources?.cpu ?? (params.snapshot === "windows-small" ? 1 : 2),
        memory: params.resources?.memory ?? (params.snapshot === "windows-small" ? 4 : 8),
        disk: params.resources?.disk ?? (params.snapshot === "windows-small" ? 30 : 50),
        state: "started",
        async refreshData() {},
        async setLabels(labels: Record<string, string>) {
          this.labels = labels;
        },
        async start() {
          this.state = "started";
        },
        async stop() {
          this.state = "stopped";
        },
        computerUse: {
          async getStatus() { return { status: desktopStarts ? "active" : "inactive" }; },
          async start() {
            desktopStarts++;
          },
        },
        async getSignedPreviewUrl(port: number, ttl: number) {
          assert.equal(port, 6080);
          assert.equal(ttl, 900);
          return { url: "https://desktop.example/?token=short-lived" };
        },
      } as unknown as Sandbox;
      data.set(sandbox.id, sandbox);
      return sandbox;
    },
  } as unknown as Pick<Daytona, "get" | "list" | "create">;
  const options = {
    workspaceId: "personal",
    instanceId: "installation-a",
    image: "test",
    autoStopMinutes: 30,
    vncPort: 6080,
  };
  return {
    service: new DaytonaComputers(client, options),
    other: new DaytonaComputers(client, { ...options, instanceId: "other" }),
    creates: () => creates,
    desktopStarts: () => desktopStarts,
  };
}
const config = {
  name: "Test desktop",
  os: "ubuntu" as const,
  cpu: 2,
  ramGb: 4,
  storageGb: 20,
};
test("creation retries reuse the durable provider record and lifecycle preserves the computer", async () => {
  const f = fixture();
  const requestId = randomUUID();
  const machine = await f.service.create(config, requestId);
  assert.equal((await f.service.create(config, requestId)).id, machine.id);
  assert.equal(f.creates(), 1);
  assert.equal((await f.service.status(machine.id, "stop")).status, "stopped");
  await assert.rejects(f.service.desktop(machine.id), /Start this computer/);
  assert.equal(f.desktopStarts(), 0);
  assert.equal((await f.service.status(machine.id, "start")).status, "running");
  assert.equal((await f.service.rename(machine.id, "Renamed")).name, "Renamed");
  const desktop = await f.service.desktop(machine.id);
  const url = new URL(desktop.url);
  assert.equal(url.protocol, "wss:");
  assert.equal(url.pathname, "/websockify");
  assert.equal(url.searchParams.get("token"), "short-lived");
  await f.service.desktop(machine.id);
  assert.equal(f.desktopStarts(), 1);
  assert.equal((await f.service.list()).length, 1);
  assert.equal((await f.other.list()).length, 0);
  for (const action of [
    () => f.other.get(machine.id),
    () => f.other.rename(machine.id, "Hijacked"),
    () => f.other.status(machine.id, "stop"),
    () => f.other.desktop(machine.id),
  ])
    await assert.rejects(action, /not found/);
});
test("API requires a token, checks workspace ownership, validates requests and does not expose errors", async () => {
  const f = fixture();
  const app = createApp({
    service: f.service,
    token: "local-access-token",
    workspaceId: "personal",
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/workspaces/`;
  const headers = {
    Authorization: "Bearer local-access-token",
    "Content-Type": "application/json",
  };
  try {
    assert.equal((await fetch(base + "personal/computers")).status, 401);
    assert.equal(
      (await fetch(base + "team/computers", { headers })).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "personal/computers", {
          headers,
          method: "POST",
          body: JSON.stringify({
            ...config,
            os: "macos",
            requestId: randomUUID(),
          }),
        })
      ).status,
      400,
    );
    const response = await fetch(base + "personal/computers", {
      headers,
      method: "POST",
      body: JSON.stringify({ ...config, requestId: randomUUID() }),
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const machine = (await response.json()) as { id: string };
    const session = await fetch(
      base + `personal/computers/${machine.id}/desktop`,
      { headers, method: "POST" },
    );
    assert.equal(session.status, 200);
    assert.equal((await session.text()).includes("local-access-token"), false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("Windows computers are created using matching Daytona snapshots and correctly labeled", async () => {
  const f = fixture();
  const requestId = randomUUID();
  const machine = await f.service.create(
    {
      name: "Windows QA",
      os: "windows",
      cpu: 2,
      ramGb: 8,
      storageGb: 50,
    },
    requestId,
  );
  assert.equal(machine.os, "windows");
  assert.equal(machine.osLabel, "Windows · Daytona");
  assert.equal(machine.name, "Windows QA");

  // Reusing the same request ID returns the existing Windows machine
  const reused = await f.service.create(
    {
      name: "Windows QA",
      os: "windows",
      cpu: 2,
      ramGb: 8,
      storageGb: 50,
    },
    requestId,
  );
  assert.equal(reused.id, machine.id);
  assert.equal(f.creates(), 1);
});

test("macOS cloud computer requires DAYTONA_MACOS_SNAPSHOT configuration", async () => {
  const f = fixture();
  const requestId = randomUUID();
  await assert.rejects(
    f.service.create(
      { name: "Mac Build", os: "macos", cpu: 4, ramGb: 8, storageGb: 40 },
      requestId,
    ),
    /macOS sandboxes require Daytona early access/,
  );
});

