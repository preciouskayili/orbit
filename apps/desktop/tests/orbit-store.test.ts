import { beforeEach, expect, test, vi } from "vitest";

let store: typeof import("../src/lib/orbit-store");
const input = { name: "Test computer", os: "ubuntu" as const, cpu: 4, ramGb: 8, storageGb: 80 };
beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  store = await import("../src/lib/orbit-store");
});
function setup() {
  const projectId = store.orbitActions.createProject("Test project", "");
  const conversationId = store.orbitActions.createConversation(projectId, "fleet-agent", "Build a test app");
  return { projectId, conversationId };
}
test("a conversation starts before a computer exists, and accepts a fleet on the fly", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  expect(store.getOrbitState().tasks[0].machineIds).toEqual([]);
  expect(() => actions.taskAction(conversationId, "resume")).toThrow("Attach a computer");
  const ids = actions.createFleet(projectId, input, 3);
  actions.attachComputers(conversationId, ids);
  actions.attachComputers(conversationId, ids);
  expect(store.getOrbitState().tasks[0].machineIds).toEqual(ids);
  actions.taskAction(conversationId, "resume");
  expect(store.getOrbitState().tasks[0].status).toBe("running");
  expect(store.getOrbitState().projects.find(p => p.id === projectId)?.machineCount).toBe(3);
});
test("human takeover pauses the agent; files survive stopping and resuming", () => {
  const { projectId, conversationId } = setup();
  const actions = store.orbitActions;
  const [mid] = actions.createFleet(projectId, input);
  actions.attachComputers(conversationId, [mid]);
  actions.taskAction(conversationId, "resume");
  actions.setControl(mid, "human");
  expect(store.getOrbitState().tasks[0].status).toBe("paused");
  expect(() => actions.taskAction(conversationId, "resume")).toThrow("return control");
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
  expect(store.getOrbitState().files[ids[0]]["run-summary.md"]).toContain("Build a test app");
  const next = actions.createConversation(projectId, "fleet-agent", "Next piece of work");
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
  expect(restored.getOrbitState().activeConversations.personal).toBe(conversationId);
  expect(restored.getOrbitState().tasks[0].messages.some(m => m.content === "Use TypeScript")).toBe(true);
  expect(restored.getOrbitState().files[ids[0]]["README.md"]).toContain("Test computer");
});
test("invalid saved data falls back safely and exposes an explanation", async () => {
  localStorage.setItem("orbit.prototype.v1", "{broken");
  vi.resetModules();
  const restored = await import("../src/lib/orbit-store");
  expect(restored.getOrbitState().projects.length).toBeGreaterThan(0);
  expect(restored.getPersistenceError()).toBeTruthy();
});
