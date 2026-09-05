import { z } from "zod";
import { ActivityEventSchema, AgentMessageSchema, CreateMachineInputSchema, MachineSchema, ProjectSchema, type CreateMachineInput } from "@orbit/shared";
import * as seed from "./demo-seed";

const workspaceSchema = z.object({ id: z.string(), name: z.string() });
const agentSchema = z.object({ id: z.string(), workspaceId: z.string(), name: z.string(), instructions: z.string(), skills: z.array(z.string()) });
const taskSchema = z.object({
  id: z.string(), projectId: z.string(), agentId: z.string(), title: z.string(), prompt: z.string(),
  machineIds: z.array(z.string()), status: z.enum(["running", "paused", "review", "completed", "cancelled"]),
  step: z.number(), createdAt: z.string(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  events: z.array(z.object({ title: z.string(), timestamp: z.string() })),
  artifacts: z.array(z.object({ name: z.string(), content: z.string() })),
});
const scheduleSchema = z.object({ id: z.string(), projectId: z.string(), agentId: z.string(), machineIds: z.array(z.string()), prompt: z.string(), cadence: z.enum(["Daily", "Weekdays", "Weekly"]), time: z.string(), enabled: z.boolean() });
const stateSchema = z.object({
  version: z.literal(1),
  activeConversations: z.record(z.string(), z.string()).default({}),
  workspaceId: z.string(), workspaces: z.array(workspaceSchema),
  projects: z.array(ProjectSchema.extend({ workspaceId: z.string() })),
  machines: z.array(MachineSchema), activity: z.array(ActivityEventSchema), messages: z.array(AgentMessageSchema),
  agents: z.array(agentSchema), tasks: z.array(taskSchema), schedules: z.array(scheduleSchema),
  control: z.record(z.string(), z.enum(["agent", "human"])),
  files: z.record(z.string(), z.record(z.string(), z.string())),
  settings: z.object({ name: z.string(), notifications: z.boolean() }),
});
export type OrbitState = z.infer<typeof stateSchema>;
// The persisted "tasks" key is retained for existing prototype data. Each record
// is now a conversation with an optional simulated execution lifecycle.
export type Task = z.infer<typeof taskSchema>;
export type OrbitAgent = z.infer<typeof agentSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
const KEY = "orbit.prototype.v1";
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function initialState(): OrbitState {
  return {
    version: 1, activeConversations: {}, workspaceId: "personal",
    workspaces: [{ id: "personal", name: "Personal workspace" }, { id: "team", name: "Orbit team" }],
    projects: seed.projects.map(p => ({ ...p, workspaceId: "personal" })),
    machines: seed.machines, activity: seed.activity, messages: seed.messages,
    agents: [{ id: "fleet-agent", workspaceId: "personal", name: "Fleet agent", instructions: "Break work into clear steps. Use separate computers when useful. Ask for review before external actions.", skills: ["terminal", "browser", "files"] }],
    tasks: [], schedules: [], control: {}, files: {},
    settings: { name: "Precious Kayili", notifications: true },
  };
}
let persistenceError = "";
function restore(): OrbitState {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return initialState();
    let decoded: unknown;
    try { decoded = JSON.parse(raw); } catch {
      persistenceError = "Saved prototype data is damaged. This session is using sample data.";
      return initialState();
    }
    const result = stateSchema.safeParse(decoded);
    if (result.success) return result.data;
    persistenceError = "Saved prototype data could not be loaded. This session is using sample data.";
  } catch { persistenceError = "Local storage is unavailable. Changes will only last for this session."; }
  return initialState();
}
let state = restore();
const listeners = new Set<() => void>();
export const getOrbitState = () => state;
export const getPersistenceError = () => persistenceError;
export function subscribeOrbit(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

function update(fn: (draft: OrbitState) => void) {
  const draft = structuredClone(state);
  fn(draft);
  const validated = stateSchema.parse(draft);
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, JSON.stringify(validated));
  } catch { persistenceError = "Could not save changes locally. Keep this window open to retain this session."; }
  state = validated;
  listeners.forEach(listener => listener());
}
function projectInWorkspace(draft: OrbitState, projectId: string) {
  const project = draft.projects.find(p => p.id === projectId && p.workspaceId === draft.workspaceId);
  if (!project) throw new Error("Project is not in the current workspace.");
  return project;
}
function taskInWorkspace(draft: OrbitState, taskId: string) {
  const task = draft.tasks.find(t => t.id === taskId);
  if (!task) throw new Error("Task not found.");
  projectInWorkspace(draft, task.projectId);
  return task;
}
function addActivity(draft: OrbitState, projectId: string, machineId: string | null, title: string, detail: string) {
  draft.activity.push({ id: id(), projectId, machineId, type: "system", title, detail, timestamp: now() });
}
function validateAssignment(draft: OrbitState, projectId: string, agentId: string, machineIds: string[]) {
  projectInWorkspace(draft, projectId);
  if (!draft.agents.some(a => a.id === agentId && a.workspaceId === draft.workspaceId)) throw new Error("Choose an agent in this workspace.");
  if (!machineIds.length || machineIds.some(mid => !draft.machines.some(m => m.id === mid && m.projectId === projectId))) throw new Error("Choose at least one computer in this project.");
}
function startTask(draft: OrbitState, input: { projectId: string; agentId: string; machineIds: string[]; prompt: string }) {
  validateAssignment(draft, input.projectId, input.agentId, input.machineIds);
  if (!input.prompt.trim()) throw new Error("Describe the work first.");
  const ids = [...new Set(input.machineIds)];
  if (draft.tasks.some(t => ["running", "paused", "review"].includes(t.status) && t.machineIds.some(mid => ids.includes(mid)))) throw new Error("One of these computers is assigned to an unfinished task. Finish or cancel that task first.");
  if (ids.some(mid => draft.control[mid] === "human")) throw new Error("Hand control back to the agent before starting a task.");
  const task: Task = {
    id: id(), projectId: input.projectId, agentId: input.agentId, prompt: input.prompt.trim(),
    title: input.prompt.trim().slice(0, 65), machineIds: ids, status: "running", step: 0,
    createdAt: now(), artifacts: [], messages: [
      { role: "user", content: input.prompt.trim() },
      { role: "assistant", content: "Plan ready. I will prepare the assigned computers, carry out the task, and collect results for your review. Use Preview next step to walk through this demo run." },
    ],
    events: [{ title: "Task created · computers allocated", timestamp: now() }],
  };
  draft.tasks.unshift(task);
  for (const machine of draft.machines.filter(m => ids.includes(m.id))) {
    machine.status = "running"; machine.lastSeenAt = now(); draft.control[machine.id] = "agent";
    addActivity(draft, input.projectId, machine.id, "Assigned to " + task.title, "Prototype run started");
  }
  return task.id;
}
export const orbitActions = {
  switchWorkspace(workspaceId: string) {
    update(d => { if (!d.workspaces.some(w => w.id === workspaceId)) throw new Error("Workspace not found."); d.workspaceId = workspaceId; });
  },
  createWorkspace(name: string) {
    const workspaceId = id();
    update(d => {
      if (name.trim().length < 2) throw new Error("Use at least two characters.");
      d.workspaces.push({ id: workspaceId, name: name.trim() }); d.workspaceId = workspaceId;
      d.agents.push({ id: id(), workspaceId, name: "Fleet agent", instructions: "Work carefully and request review before external actions.", skills: ["terminal", "browser", "files"] });
    });
    return workspaceId;
  },
  createProject(name: string, description: string) {
    const projectId = id();
    update(d => {
      if (name.trim().length < 2) throw new Error("Use at least two characters.");
      d.projects.push({ id: projectId, workspaceId: d.workspaceId, name: name.trim(), description: description.trim(), machineCount: 0, updatedAt: now() });
    });
    return projectId;
  },
  createFleet(projectId: string, input: CreateMachineInput, count = 1) {
    const parsed = CreateMachineInputSchema.parse(input);
    const created: string[] = [];
    update(d => {
      const project = projectInWorkspace(d, projectId);
      if (!Number.isInteger(count) || count < 1 || count > 10) throw new Error("Create between 1 and 10 computers.");
      for (let index = 0; index < count; index++) {
        const machineId = id(); created.push(machineId);
        d.machines.push({ ...parsed, id: machineId, name: parsed.name + (count > 1 ? " " + (index + 1) : ""), projectId, osLabel: { ubuntu: "Ubuntu 24.04", windows: "Windows 11", macos: "macOS" }[parsed.os], status: "running", lastSeenAt: now() });
        d.files[machineId] = { "README.md": "# " + parsed.name + "\n\nPersistent workspace for your agent.\n" };
        addActivity(d, projectId, machineId, "Computer created", "Prototype computer ready");
      }
      project.machineCount += count; project.updatedAt = now();
    });
    return created;
  },
  machineStatus(machineId: string, status: "running" | "stopped") {
    update(d => {
      const machine = d.machines.find(m => m.id === machineId);
      if (!machine) throw new Error("Computer not found.");
      projectInWorkspace(d, machine.projectId);
      machine.status = status; machine.lastSeenAt = now();
      if (status === "stopped") d.tasks.filter(t => t.status === "running" && t.machineIds.includes(machineId)).forEach(t => { t.status = "paused"; t.events.push({ title: "Paused · computer stopped", timestamp: now() }); });
      addActivity(d, machine.projectId, machineId, status === "running" ? "Computer started" : "Computer stopped", "Prototype lifecycle action");
    });
  },
  renameMachine(machineId: string, name: string) {
    update(d => {
      const machine = d.machines.find(m => m.id === machineId);
      if (!machine || name.trim().length < 2) throw new Error("Enter a valid computer name.");
      projectInWorkspace(d, machine.projectId); machine.name = name.trim();
    });
  },
  setControl(machineId: string, control: "agent" | "human") {
    update(d => {
      const machine = d.machines.find(m => m.id === machineId);
      if (!machine) throw new Error("Computer not found.");
      projectInWorkspace(d, machine.projectId);
      d.control[machineId] = control;
      if (control === "human") d.tasks.filter(t => t.status === "running" && t.machineIds.includes(machineId)).forEach(t => { t.status = "paused"; t.events.push({ title: "Paused · human took control", timestamp: now() }); });
      addActivity(d, machine.projectId, machineId, control === "human" ? "Human took control" : "Control returned to agent", "Session handoff");
    });
  },
  saveFile(machineId: string, name: string, content: string) {
    update(d => {
      const machine = d.machines.find(m => m.id === machineId);
      if (!machine || machine.status !== "running" || d.control[machineId] !== "human") throw new Error("Start the computer and take control to edit files.");
      projectInWorkspace(d, machine.projectId);
      if (!name.trim()) throw new Error("Enter a filename.");
      d.files[machineId] ??= {}; d.files[machineId][name.trim()] = content;
      addActivity(d, machine.projectId, machineId, "Saved " + name, "Workspace file updated");
    });
  },
  saveAgent(input: Omit<OrbitAgent, "workspaceId" | "id">, agentId?: string) {
    update(d => {
      if (!input.name.trim()) throw new Error("Enter an agent name.");
      const existing = d.agents.find(a => a.id === agentId && a.workspaceId === d.workspaceId);
      if (existing) Object.assign(existing, input);
      else d.agents.push({ ...input, id: id(), workspaceId: d.workspaceId });
    });
  },
  // Conversations can begin before a computer exists. Allocation is a separate action.
  openConversation(conversationId: string) {
    update(d => { taskInWorkspace(d, conversationId); d.activeConversations[d.workspaceId] = conversationId; });
  },
  newConversation() {
    update(d => { delete d.activeConversations[d.workspaceId]; });
  },
  createConversation(projectId: string, agentId: string, prompt: string) {
    const conversationId = id();
    update(d => {
      projectInWorkspace(d, projectId);
      if (!d.agents.some(a => a.id === agentId && a.workspaceId === d.workspaceId)) throw new Error("Choose an agent in this workspace.");
      if (!prompt.trim()) throw new Error("Tell your agent what you want to work on.");
      d.tasks.unshift({
        id: conversationId, projectId, agentId, title: prompt.trim().slice(0, 65), prompt: prompt.trim(),
        machineIds: [], status: "paused", step: 0, createdAt: now(), events: [], artifacts: [],
        messages: [
          { role: "user", content: prompt.trim() },
          { role: "assistant", content: "Let’s work on this together. Attach an existing computer or create one below, and you can inspect its desktop alongside our conversation. This is a local preview: responses and execution are simulated until the agent backend is connected." },
        ],
      });
      d.activeConversations[d.workspaceId] = conversationId;
    });
    return conversationId;
  },
  attachComputers(conversationId: string, machineIds: string[]) {
    update(d => {
      const conversation = taskInWorkspace(d, conversationId);
      if (["completed", "cancelled"].includes(conversation.status)) throw new Error("Start a new conversation to assign more computers.");
      validateAssignment(d, conversation.projectId, conversation.agentId, machineIds);
      const added = [...new Set(machineIds)].filter(mid => !conversation.machineIds.includes(mid));
      if (d.tasks.some(t => t.id !== conversation.id && ["running", "paused", "review"].includes(t.status) && t.machineIds.some(mid => added.includes(mid)))) throw new Error("That computer is busy in another conversation.");
      conversation.machineIds.push(...added);
      if (added.length) {
        conversation.messages.push({ role: "assistant", content: "Added " + added.map(mid => d.machines.find(m => m.id === mid)!.name).join(", ") + ". Open a desktop to follow along. Start stopped computers and hand control back before continuing." });
        conversation.events.push({ title: "Computers attached", timestamp: now() });
      }
    });
  },
  createTask(input: { projectId: string; agentId: string; machineIds: string[]; prompt: string }) {
    let taskId = ""; update(d => { taskId = startTask(d, input); d.activeConversations[d.workspaceId] = taskId; }); return taskId;
  },
  message(taskId: string, content: string) {
    update(d => {
      const task = taskInWorkspace(d, taskId);
      if (!content.trim()) return;
      task.messages.push({ role: "user", content: content.trim() });
      task.messages.push({ role: "assistant", content: "Your instructions are saved with our conversation. This prototype records context; a connected agent will respond and act on it." });
    });
  },
  taskAction(taskId: string, action: "pause" | "resume" | "advance" | "approve" | "cancel") {
    update(d => {
      const task = taskInWorkspace(d, taskId);
      if (["completed", "cancelled"].includes(task.status)) throw new Error("This task has ended.");
      if (action === "cancel") { task.status = "cancelled"; task.events.push({ title: "Task cancelled · computers retained", timestamp: now() }); return; }
      if (action === "pause" && task.status === "running") task.status = "paused";
      else if (action === "resume" && task.status === "paused") {
        if (!task.machineIds.length) throw new Error("Attach a computer first.");
        if (task.machineIds.some(mid => d.control[mid] === "human" || d.machines.find(m => m.id === mid)?.status !== "running")) throw new Error("Start all assigned computers and return control to the agent first.");
        task.status = "running";
      } else if (action === "advance" && task.status === "running") {
        task.step += 1;
        const title = task.step === 1 ? "Workspace prepared" : task.step === 2 ? "Example work recorded" : "Results ready for review";
        task.events.push({ title, timestamp: now() });
        task.messages.push({ role: "assistant", content: title + ". This is a simulated execution step; no cloud tools were run." });
        task.machineIds.forEach(mid => addActivity(d, task.projectId, mid, title, "Demo task: " + task.title));
        if (task.step >= 3) {
          task.status = "review";
          task.artifacts = [{ name: "run-summary.md", content: "# Demo run summary\n\nTask: " + task.prompt + "\n\nComputers: " + task.machineIds.map(mid => d.machines.find(m => m.id === mid)?.name).join(", ") + "\n\nThis artifact demonstrates the review flow. Real execution will be connected by the backend.\n" }];
          task.machineIds.forEach(mid => { d.files[mid] ??= {}; d.files[mid]["run-summary.md"] = task.artifacts[0]!.content; });
        }
      } else if (action === "approve" && task.status === "review") { task.status = "completed"; task.events.push({ title: "Results approved", timestamp: now() }); }
      else throw new Error("That action is not available for this task.");
    });
  },
  saveSchedule(input: Omit<Schedule, "id" | "enabled">) {
    update(d => { validateAssignment(d, input.projectId, input.agentId, input.machineIds); if (!input.prompt.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new Error("Add a task and valid time."); d.schedules.push({ ...input, id: id(), enabled: true }); });
  },
  toggleSchedule(scheduleId: string) {
    update(d => { const schedule = d.schedules.find(s => s.id === scheduleId); if (!schedule) return; projectInWorkspace(d, schedule.projectId); schedule.enabled = !schedule.enabled; });
  },
  runSchedule(scheduleId: string) {
    let taskId = "";
    update(d => { const schedule = d.schedules.find(s => s.id === scheduleId); if (!schedule) throw new Error("Schedule not found."); taskId = startTask(d, schedule); d.activeConversations[d.workspaceId] = taskId; });
    return taskId;
  },
  settings(input: OrbitState["settings"]) { update(d => { d.settings = input; }); },
};
