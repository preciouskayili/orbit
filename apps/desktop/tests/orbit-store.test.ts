import { beforeEach, expect, test, vi } from "vitest";

let store: typeof import("../src/lib/orbit-store");
const input = {
  name: "Test computer",
  os: "ubuntu" as const,
  cpu: 4,
  ramGb: 8,
  storageGb: 80,
};
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  store = await import("../src/lib/orbit-store");
});
function setup() {
  const projectId = store.orbitActions.createProject("Test project", "");
  const conversationId = store.orbitActions.createConversation(
    projectId,
    "fleet-agent",
    "Build a test app",
  );
  return { projectId, conversationId };
}
test("a conversation starts before a computer exists, and accepts a fleet on the fly", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  expect(store.getOrbitState().tasks[0].machineIds).toEqual([]);
  expect(() => actions.taskAction(conversationId, "resume")).toThrow(
    "Attach a computer",
  );
  const ids = actions.createFleet(projectId, input, 3);
  actions.attachComputers(conversationId, ids);
  actions.attachComputers(conversationId, ids);
  expect(store.getOrbitState().tasks[0].machineIds).toEqual(ids);
  actions.taskAction(conversationId, "resume");
  expect(store.getOrbitState().tasks[0].status).toBe("running");
  expect(
    store
      .getOrbitState()
      .machines.filter((m) => ids.includes(m.id))
      .every((m) => m.workspaceId === "personal"),
  ).toBe(true);
});
test("human takeover pauses the agent; files survive stopping and resuming", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  const [mid] = actions.createFleet(projectId, input);
  actions.attachComputers(conversationId, [mid]);
  actions.taskAction(conversationId, "resume");
  actions.setControl(mid, "human");
  expect(store.getOrbitState().tasks[0].status).toBe("paused");
  expect(() => actions.taskAction(conversationId, "resume")).toThrow(
    "finish interacting",
  );
  actions.saveFile(mid, "notes.md", "Keep this.");
  actions.machineStatus(mid, "stopped");
  expect(() => actions.saveFile(mid, "notes.md", "Lost")).toThrow();
  expect(store.getOrbitState().files[mid]["notes.md"]).toBe("Keep this.");
  actions.machineStatus(mid, "running");
  actions.setControl(mid, "agent");
  actions.taskAction(conversationId, "resume");
  expect(store.getOrbitState().tasks[0].status).toBe("running");
});
test("preview runs reach review, deliver files, and release computers when approved", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  const ids = actions.createFleet(projectId, input, 2);
  actions.attachComputers(conversationId, ids);
  actions.taskAction(conversationId, "resume");
  for (let i = 0; i < 3; i++) actions.taskAction(conversationId, "advance");
  expect(store.getOrbitState().tasks[0].status).toBe("review");
  expect(store.getOrbitState().files[ids[0]]["run-summary.md"]).toContain(
    "Build a test app",
  );
  const next = actions.createConversation(
    projectId,
    "fleet-agent",
    "Next piece of work",
  );
  expect(() => actions.attachComputers(next, ids)).toThrow("busy");
  actions.taskAction(conversationId, "approve");
  actions.attachComputers(next, ids);
  expect(store.getOrbitState().tasks[0].machineIds).toEqual(ids);
});
test("workspace boundaries and invalid allocations cannot partially mutate data", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  const before = store.getOrbitState();
  expect(() => actions.createFleet(projectId, input, 11)).toThrow();
  expect(() => actions.createFleet(projectId, { ...input, cpu: -1 })).toThrow();
  expect(store.getOrbitState()).toBe(before);
  actions.createWorkspace("Another workspace");
  expect(() => actions.message(conversationId, "Cross workspace")).toThrow();
  expect(() => actions.openConversation(conversationId)).toThrow();
  expect(() => actions.createFleet(projectId, input)).toThrow();
});
test("conversation context, active selection and files restore after reload", async () => {
  const { projectId, conversationId } = setup();
  const ids = store.orbitActions.createFleet(projectId, input);
  store.orbitActions.attachComputers(conversationId, ids);
  store.orbitActions.message(conversationId, "Use TypeScript");
  vi.resetModules();
  const restored = await import("../src/lib/orbit-store");
  expect(restored.getOrbitState().activeConversations.personal).toBe(
    conversationId,
  );
  expect(
    restored
      .getOrbitState()
      .tasks[0].messages.some((m) => m.content === "Use TypeScript"),
  ).toBe(true);
  expect(restored.getOrbitState().files[ids[0]]["README.md"]).toContain(
    "Test computer",
  );
});
test("invalid saved data falls back safely and exposes an explanation", async () => {
  localStorage.setItem("orbit.prototype.v1", "{broken");
  vi.resetModules();
  const restored = await import("../src/lib/orbit-store");
  expect(restored.getOrbitState().projects.length).toBeGreaterThan(0);
  expect(restored.getPersistenceError()).toBeTruthy();
});

test("a shared computer can move between projects without being recreated", async () => {
  const actions = store.orbitActions;
  const { projectComputers, workspaceComputers } =
    await import("../src/lib/orbit-selectors");
  const p1 = actions.createProject("Project one", "");
  const p2 = actions.createProject("Project two", "");
  const [mid] = actions.createComputers(input);
  const c1 = actions.createConversation(p1, "fleet-agent", "First");
  actions.attachComputers(c1, [mid]);
  expect(projectComputers(store.getOrbitState(), p1).map((m) => m.id)).toEqual([
    mid,
  ]);
  const c2 = actions.createConversation(p2, "fleet-agent", "Second");
  expect(() => actions.attachComputers(c2, [mid])).toThrow("busy");
  actions.taskAction(c1, "cancel");
  actions.attachComputers(c2, [mid]);
  expect(projectComputers(store.getOrbitState(), p1)).toEqual([]);
  expect(projectComputers(store.getOrbitState(), p2).map((m) => m.id)).toEqual([
    mid,
  ]);
  expect(
    workspaceComputers(store.getOrbitState()).some((m) => m.id === mid),
  ).toBe(true);
});
test("mentioning a computer requests permission; denial never assigns it", () => {
  const { projectId } = setup();
  const actions = store.orbitActions;
  const [mid] = actions.createComputers(input);
  const cid = actions.createConversation(
    projectId,
    "fleet-agent",
    'Work on @"Test computer"',
    [mid],
  );
  const request = store.getOrbitState().tasks.find((t) => t.id === cid)!
    .requests[0];
  expect(store.getOrbitState().tasks[0].machineIds).toEqual([]);
  actions.resolveComputerRequest(cid, request.id, false);
  expect(store.getOrbitState().tasks[0].machineIds).toEqual([]);
  actions.message(cid, "Please use it now", [mid]);
  const pending = store
    .getOrbitState()
    .tasks[0].requests.find((r) => r.status === "pending")!;
  actions.resolveComputerRequest(cid, pending.id, true);
  expect(store.getOrbitState().tasks[0].machineIds).toEqual([mid]);
});
test("autonomous allocation needs opt-in, respects human control, and can be revoked", () => {
  const { conversationId } = setup();
  const actions = store.orbitActions;
  const [mid, other] = actions.createComputers(input, 2);
  actions.setComputerAccess(conversationId, "workspace");
  actions.message(conversationId, "Use this", [mid]);
  expect(store.getOrbitState().tasks[0].machineIds).toContain(mid);
  actions.setControl(other, "human");
  actions.message(conversationId, "And this", [other]);
  expect(store.getOrbitState().tasks[0].machineIds).not.toContain(other);
  expect(store.getOrbitState().tasks[0].requests[0].status).toBe("pending");
  actions.setComputerAccess(conversationId, "ask");
  const [third] = actions.createComputers({ ...input, name: "Third" });
  actions.message(conversationId, "Use another", [third]);
  expect(store.getOrbitState().tasks[0].machineIds).not.toContain(third);
});
test("agent can select an available computer under an explicit conversation permission", () => {
  const { conversationId } = setup();
  store.orbitActions.setComputerAccess(conversationId, "workspace");
  store.orbitActions.requestAvailableComputer(conversationId);
  expect(store.getOrbitState().tasks[0].machineIds.length).toBe(1);
  expect(store.getOrbitState().tasks[0].requests).toEqual([]);
});

test("direct input yields and resumes automatically without overriding an intentional pause", () => {
  const { projectId, conversationId } = setup();
  const a = store.orbitActions;
  const [mid] = a.createComputers(input);
  a.attachComputers(conversationId, [mid]);
  a.taskAction(conversationId, "resume");
  const token = a.beginInteraction(mid);
  expect(store.getOrbitState().tasks[0].status).toBe("paused");
  expect(store.getOrbitState().control[mid]).toBe("human");
  a.endInteraction(mid, "wrong-token");
  expect(store.getOrbitState().control[mid]).toBe("human");
  a.endInteraction(mid, token);
  expect(store.getOrbitState().tasks[0].status).toBe("running");
  a.taskAction(conversationId, "pause");
  const next = a.beginInteraction(mid);
  a.endInteraction(mid, next);
  expect(store.getOrbitState().tasks[0].status).toBe("paused");
});

test("a fleet resumes only once all simultaneous desktop interactions finish", () => {
  const { conversationId } = setup();
  const a = store.orbitActions;
  const [first, second] = a.createComputers(input, 2);
  a.attachComputers(conversationId, [first, second]);
  a.taskAction(conversationId, "resume");
  const one = a.beginInteraction(first);
  const two = a.beginInteraction(second);
  a.endInteraction(first, one);
  expect(store.getOrbitState().tasks[0].status).toBe("paused");
  a.endInteraction(second, two);
  expect(store.getOrbitState().tasks[0].status).toBe("running");
});

test("workspace navigation can release an existing input lease but cannot acquire outside its scope", () => {
  const { conversationId } = setup();
  const a = store.orbitActions;
  const [mid] = a.createComputers(input);
  const token = a.beginInteraction(mid);
  a.createWorkspace("Another place");
  expect(() => a.beginInteraction(mid)).toThrow("current workspace");
  a.endInteraction(mid, token);
  expect(store.getOrbitState().control[mid]).toBe("agent");
});

test("deleting a session releases its computers and active selection without deleting computer files", async () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  const [machineId] = actions.createFleet(projectId, input);
  actions.attachComputers(conversationId, [machineId!]);
  const lease = actions.beginInteraction(machineId!);
  actions.saveFile(machineId!, "keep.txt", "Keep this computer file");
  actions.endInteraction(machineId!, lease);
  actions.taskAction(conversationId, "resume");
  await actions.deleteConversation(conversationId);
  expect(store.getOrbitState().tasks.some((t) => t.id === conversationId)).toBe(false);
  expect(store.getOrbitState().activeConversations.personal).toBeUndefined();
  expect(store.getOrbitState().machines.find((m) => m.id === machineId)?.status).toBe("running");
  expect(store.getOrbitState().files[machineId!]?.["keep.txt"]).toBe("Keep this computer file");
  const next = actions.createSession(projectId);
  expect(() => actions.attachComputers(next, [machineId!])).not.toThrow();
});

test("session deletion rejects a session from another workspace", async () => {
  const { conversationId } = setup();
  store.orbitActions.switchWorkspace("team");
  const before = store.getOrbitState();
  await expect(store.orbitActions.deleteConversation(conversationId)).rejects.toThrow("current workspace");
  expect(store.getOrbitState()).toBe(before);
});

test('greetings do not become titles, substantive follow-ups do, and manual titles persist', () => {
  const a = store.orbitActions; const project = a.createProject('Titles', '');
  const id = a.createConversation(project, 'fleet-agent', 'hi');
  expect(store.getOrbitState().tasks.find(t => t.id === id)!.title).toBe('New session');
  a.message(id, 'can you open vscode and help me configure a really long list of extensions');
  const title = store.getOrbitState().tasks.find(t => t.id === id)!.title;
  expect(title).toMatch(/^Open vscode/); expect(title.length).toBeLessThanOrEqual(55);
  a.renameConversation(id, 'Editor setup'); a.message(id, 'Another task');
  a.renameConversation(id, 'Generated title', 'generated');
  expect(store.getOrbitState().tasks.find(t => t.id === id)!.title).toBe('Editor setup');
});
test('folder deletion removes its sessions and assignments while retaining computers and files', async () => {
  const { projectId, conversationId } = setup(); const a = store.orbitActions;
  const [mid] = a.createFleet(projectId, input); a.attachComputers(conversationId, [mid]);
  const files = store.getOrbitState().files[mid]; const other = a.createProject('Other', '');
  const retained = a.createConversation(other, 'fleet-agent', 'Keep this conversation');
  await a.deleteProject(projectId);
  expect(store.getOrbitState().projects.some(p => p.id === projectId)).toBe(false);
  expect(store.getOrbitState().tasks.some(t => t.id === conversationId)).toBe(false);
  expect(store.getOrbitState().tasks.some(t => t.id === retained)).toBe(true);
  expect(store.getOrbitState().machines.some(m => m.id === mid && m.workspaceId === 'personal')).toBe(true);
  expect(store.getOrbitState().files[mid]).toEqual(files);
});
test('a running conversation cannot change model or profile', () => {
  const { conversationId } = setup(); const a = store.orbitActions;
  a.setConversationModel(conversationId, 'gpt-6-astra');
  a.beginAgentRun('personal', { id: crypto.randomUUID(), conversationId, status: 'running', messages: [] });
  expect(() => a.setConversationModel(conversationId, 'claude-fable-5')).toThrow(/Stop/);
  expect(() => a.setConversationAgent(conversationId, 'fleet-agent')).toThrow(/Stop/);
});
