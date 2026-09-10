import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { AgentRun } from "@orbit/shared";
vi.mock("../src/lib/computer-config", () => ({ cloudComputersEnabled: true, liveAgentsEnabled: true }));
import { AgentPanel } from "../src/components/agent-panel";
import { LiveAgentSync } from "../src/components/live-agent-sync";
import { liveAgents } from "../src/lib/live-agents";
import { orbitActions, getOrbitState } from "../src/lib/orbit-store";

beforeEach(() => {
  orbitActions.switchWorkspace("personal");
  orbitActions.newConversation();
  vi.stubEnv("VITE_ORBIT_API_TOKEN", "test-token");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const current = () => getOrbitState().tasks.find((t) => t.id === getOrbitState().activeConversations.personal)!;
function create() {
  const state = getOrbitState();
  return orbitActions.createConversation(state.projects.find((p) => p.workspaceId === "personal")!.id, state.agents.find((a) => a.workspaceId === "personal")!.id, "Check the computer");
}
function snapshot(id: string, conversationId: string, status: AgentRun["status"] = "completed"): AgentRun {
  return { id, conversationId, status, messages: [{ id: "real-message", role: "assistant", content: "Hello from the agent" }] };
}

test("sending chat starts OpenAI execution and renders streamed snapshots without demo replies", async () => {
  let run: AgentRun;
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    if (body.requestId) run = snapshot(body.requestId, body.conversationId, "running");
    else run = { ...run!, status: "completed" };
    return Response.json(run!);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<MemoryRouter><LiveAgentSync /><AgentPanel projectId="" width={480} /></MemoryRouter>);
  fireEvent.change(screen.getByRole("combobox", { name: "Message your agent" }), { target: { value: "Hello" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await screen.findByText("Hello from the agent");
  await waitFor(() => expect(current().liveRun?.status).toBe("completed"));
  expect(screen.queryByText(/responses and execution are simulated/)).toBeNull();
  const sent = JSON.parse(fetcher.mock.calls[0]![1].body as string);
  expect(sent.messages).toEqual([{ role: "user", content: "Hello" }]);
  expect(sent.machineIds).toEqual([]);
  expect(sent.instructions).toBeTruthy();
  expect(fetcher.mock.calls[0]![1].headers).toMatchObject({ Authorization: "Bearer test-token" });
});

test("computer permission must be resolved before a run can start", async () => {
  const id = create();
  const machine = { id: "agent-test-desktop", name: "Agent test", workspaceId: "personal", projectId: "", provider: "daytona" as const, os: "ubuntu" as const, osLabel: "Linux", status: "running" as const, cpu: 2, ramGb: 4, storageGb: 10, lastSeenAt: new Date().toISOString() };
  orbitActions.receiveCloudComputer("personal", machine);
  orbitActions.message(id, "Use this computer", [machine.id]);
  const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    return Response.json(snapshot(body.requestId, body.conversationId));
  });
  vi.stubGlobal("fetch", fetcher);
  await liveAgents.start(id);
  expect(fetcher).not.toHaveBeenCalled();
  orbitActions.resolveComputerRequest(id, current().requests[0]!.id, true);
  await liveAgents.start(id);
  expect(JSON.parse(fetcher.mock.calls[0]![1].body as string).machineIds).toEqual([machine.id]);
});

test("lost start response reconnects to the same run without submitting another turn", async () => {
  const id = create();
  let accepted: AgentRun;
  const fetcher = vi.fn(async (url: string, options: RequestInit) => {
    const body = JSON.parse(options.body as string);
    if (body.requestId) {
      accepted = snapshot(body.requestId, body.conversationId);
      throw new TypeError("connection lost");
    }
    expect(url.endsWith(accepted!.id)).toBe(true);
    return Response.json(accepted!);
  });
  vi.stubGlobal("fetch", fetcher);
  await liveAgents.start(id);
  expect(current().liveRun?.status).toBe("waiting");
  await liveAgents.poll("personal", current());
  expect(current().liveRun?.status).toBe("completed");
  expect(fetcher.mock.calls.filter(([, opts]) => JSON.parse(opts.body as string).requestId)).toHaveLength(1);
});

test("an API restart makes the old run retryable, and stale snapshots cannot replace a later run", async () => {
  const conversationId = create();
  const old = snapshot(crypto.randomUUID(), conversationId, "running");
  orbitActions.beginAgentRun("personal", old);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "API restarted" }, { status: 404 })));
  await liveAgents.poll("personal", current());
  expect(current().liveRun?.status).toBe("failed");
  const next = snapshot(crypto.randomUUID(), conversationId);
  orbitActions.beginAgentRun("personal", { ...next, status: "running" });
  orbitActions.receiveAgentRun("personal", next);
  orbitActions.receiveAgentRun("personal", { ...old, status: "cancelled" });
  expect(current().liveRun?.id).toBe(next.id);
  expect(current().liveRun?.status).toBe("completed");
});

test("missing server key is visible and leaves the conversation available for retry", async () => {
  const id = create();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "Set OPENAI_API_KEY" }, { status: 503 })));
  await liveAgents.start(id);
  expect(current().liveRun?.status).toBe("failed");
  expect(current().liveRun?.error).toBe("Set OPENAI_API_KEY");
});
