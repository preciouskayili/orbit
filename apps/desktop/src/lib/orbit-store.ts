import { fallbackTitle } from "./session-titles";
import { cloudComputersEnabled, liveAgentsEnabled } from "./computer-config";
import {
  attachmentSchema,
  removeAttachments,
  type ChatAttachment,
} from "./chat-attachments";
import { z } from "zod";
import {
  ActivityEventSchema,
  AgentMessageSchema,
  CreateMachineInputSchema,
  MachineSchema,
  ProjectSchema,
  type CreateMachineInput,
  type Machine,
  AgentRunSchema,
  type AgentRun,
} from "@orbit/shared";
import * as seed from "./demo-seed";

const workspaceSchema = z.object({ id: z.string(), name: z.string() });
const agentSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  instructions: z.string(),
  skills: z.array(z.string()),
  mcpServerIds: z.array(z.string()).optional(),
});
const taskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  agentId: z.string(),
  title: z.string(),
  titleSource: z.enum(["automatic", "generated", "manual"]).optional(),
  model: z.string().optional(),
  prompt: z.string(),
  computerAccess: z.enum(["ask", "workspace"]).default("ask"),
  requests: z
    .array(
      z.object({
        id: z.string(),
        machineId: z.string(),
        status: z.enum(["pending", "allowed", "denied"]),
      }),
    )
    .default([]),
  machineIds: z.array(z.string()),
  status: z.enum(["running", "paused", "review", "completed", "cancelled"]),
  step: z.number(),
  createdAt: z.string(),
  messages: z.array(
    z.object({
      id: z.string().optional(),
      runId: z.string().optional(),
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      attachments: z.array(attachmentSchema).max(8).optional(),
      tool: z
        .object({
          name: z.enum(["terminal", "search", "files", "computer", "mcp"]),
          status: z.enum(["running", "completed", "failed"]).optional(),
          input: z.string(),
          output: z.string(),
          machineId: z.string().optional(),
        })
        .optional(),
    }),
  ),
  events: z.array(z.object({ title: z.string(), timestamp: z.string() })),
  artifacts: z.array(z.object({ name: z.string(), content: z.string() })),
  liveRun: AgentRunSchema.optional(),
});
const scheduleSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  agentId: z.string(),
  machineIds: z.array(z.string()),
  prompt: z.string(),
  cadence: z.enum(["Daily", "Weekdays", "Weekly"]),
  time: z.string(),
  enabled: z.boolean(),
});
const stateSchema = z.object({
  version: z.literal(1),
  activeConversations: z.record(z.string(), z.string()).default({}),
  workspaceId: z.string(),
  workspaces: z.array(workspaceSchema),
  projects: z.array(ProjectSchema.extend({ workspaceId: z.string() })),
  machines: z.array(MachineSchema),
  activity: z.array(ActivityEventSchema),
  messages: z.array(AgentMessageSchema),
  agents: z.array(agentSchema),
  tasks: z.array(taskSchema),
  schedules: z.array(scheduleSchema),
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
    version: 1,
    activeConversations: {},
    workspaceId: "personal",
    workspaces: cloudComputersEnabled
      ? [{ id: "personal", name: "Personal workspace" }]
      : [
          { id: "personal", name: "Personal workspace" },
          { id: "team", name: "Orbit team" },
        ],
    projects: cloudComputersEnabled
      ? [
          {
            id: "personal",
            workspaceId: "personal",
            name: "Personal",
            description: "",
            machineCount: 0,
            updatedAt: now(),
          },
        ]
      : seed.projects.map((p) => ({ ...p, workspaceId: "personal" })),
    machines: cloudComputersEnabled
      ? []
      : seed.machines.map((m) => ({ ...m, workspaceId: "personal" })),
    activity: cloudComputersEnabled ? [] : seed.activity,
    messages: cloudComputersEnabled ? [] : seed.messages,
    agents: [
      {
        id: "fleet-agent",
        workspaceId: "personal",
        name: "Fleet agent",
        instructions:
          "Break work into clear steps. Use separate computers when useful. Ask for review before external actions.",
        skills: ["terminal", "browser", "files"],
      },
    ],
    tasks: [],
    schedules: [],
    control: {},
    files: {},
    settings: {
      name: cloudComputersEnabled ? "You" : "Precious Kayili",
      notifications: true,
    },
  };
}
let persistenceError = "";
function restore(): OrbitState {
  try {
    const raw =
      typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    if (!raw) return initialState();
    let decoded: unknown;
    try {
      decoded = JSON.parse(raw);
    } catch {
      persistenceError =
        "Saved prototype data is damaged. This session is using sample data.";
      return initialState();
    }
    const result = stateSchema.safeParse(decoded);
    if (result.success) {
      for (const task of result.data.tasks)
        if (
          !task.titleSource &&
          (task.title === task.prompt.slice(0, 65) ||
            task.title === "New session")
        ) {
          task.title = fallbackTitle(task.messages);
          task.titleSource = "automatic";
        }
      return { ...result.data, control: {} };
    } // Desktop input locks are transient.
    persistenceError =
      "Saved prototype data could not be loaded. This session is using sample data.";
  } catch {
    persistenceError =
      "Local storage is unavailable. Changes will only last for this session.";
  }
  return initialState();
}
let state = restore();
const listeners = new Set<() => void>();
export const getOrbitState = () => state;
export const getPersistenceError = () => persistenceError;
export function subscribeOrbit(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function update(fn: (draft: OrbitState) => void) {
  const draft = structuredClone(state);
  fn(draft);
  const validated = stateSchema.parse(draft);
  try {
    if (typeof localStorage !== "undefined")
      localStorage.setItem(KEY, JSON.stringify(validated));
  } catch {
    persistenceError =
      "Could not save changes locally. Keep this window open to retain this session.";
  }
  state = validated;
  listeners.forEach((listener) => listener());
}
function projectInWorkspace(draft: OrbitState, projectId: string) {
  const project = draft.projects.find(
    (p) => p.id === projectId && p.workspaceId === draft.workspaceId,
  );
  if (!project) throw new Error("Project is not in the current workspace.");
  return project;
}
function taskInWorkspace(draft: OrbitState, taskId: string) {
  const task = draft.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found.");
  projectInWorkspace(draft, task.projectId);
  return task;
}
function addActivity(
  draft: OrbitState,
  projectId: string,
  machineId: string | null,
  title: string,
  detail: string,
) {
  draft.activity.push({
    id: id(),
    projectId,
    machineId,
    type: "system",
    title,
    detail,
    timestamp: now(),
  });
}
function validateAssignment(
  draft: OrbitState,
  projectId: string,
  agentId: string,
  machineIds: string[],
) {
  projectInWorkspace(draft, projectId);
  if (
    !draft.agents.some(
      (a) => a.id === agentId && a.workspaceId === draft.workspaceId,
    )
  )
    throw new Error("Choose an agent in this workspace.");
  if (!machineIds.length) throw new Error("Choose at least one computer.");
  machineIds.forEach((mid) => machineInWorkspace(draft, mid));
}
function startTask(
  draft: OrbitState,
  input: {
    projectId: string;
    agentId: string;
    machineIds: string[];
    prompt: string;
  },
) {
  validateAssignment(draft, input.projectId, input.agentId, input.machineIds);
  if (!input.prompt.trim()) throw new Error("Describe the work first.");
  const ids = [...new Set(input.machineIds)];
  if (
    draft.tasks.some(
      (t) =>
        ["running", "paused", "review"].includes(t.status) &&
        t.machineIds.some((mid) => ids.includes(mid)),
    )
  )
    throw new Error(
      "One of these computers is assigned to an unfinished task. Finish or cancel that task first.",
    );
  if (ids.some((mid) => draft.control[mid] === "human"))
    throw new Error(
      "Wait for the current desktop interaction to finish before starting.",
    );
  const task: Task = {
    id: id(),
    projectId: input.projectId,
    agentId: input.agentId,
    prompt: input.prompt.trim(),
    title: fallbackTitle([{ role: "user", content: input.prompt }]),
    machineIds: ids,
    computerAccess: "ask",
    requests: [],
    status: "running",
    step: 0,
    createdAt: now(),
    artifacts: [],
    messages: [
      { role: "user", content: input.prompt.trim() },
      {
        role: "assistant",
        content:
          "Plan ready. I will prepare the assigned computers, carry out the task, and collect results for your review. Use Preview next step to walk through this demo run.",
      },
    ],
    events: [{ title: "Task created · computers allocated", timestamp: now() }],
  };
  draft.tasks.unshift(task);
  for (const machine of draft.machines.filter((m) => ids.includes(m.id))) {
    machine.status = "running";
    machine.lastSeenAt = now();
    draft.control[machine.id] = "agent";
    addActivity(
      draft,
      input.projectId,
      machine.id,
      "Assigned to " + task.title,
      "Prototype run started",
    );
  }
  return task.id;
}
function machineInWorkspace(draft: OrbitState, machineId: string) {
  const machine = draft.machines.find((m) => m.id === machineId);
  const workspaceId =
    machine?.workspaceId ??
    draft.projects.find((p) => p.id === machine?.projectId)?.workspaceId;
  if (
    !machine ||
    workspaceId !== draft.workspaceId ||
    (cloudComputersEnabled
      ? machine.provider !== "daytona"
      : Boolean(machine.provider))
  )
    throw new Error("Computer is not in the current workspace.");
  return machine;
}
function grantComputer(
  draft: OrbitState,
  conversation: Task,
  machineId: string,
) {
  machineInWorkspace(draft, machineId);
  if (
    draft.tasks.some(
      (t) =>
        t.id !== conversation.id &&
        ["running", "paused", "review"].includes(t.status) &&
        t.machineIds.includes(machineId),
    )
  )
    throw new Error("That computer is busy in another conversation.");
  if (!conversation.machineIds.includes(machineId))
    conversation.machineIds.push(machineId);
}
function requestComputer(
  draft: OrbitState,
  conversation: Task,
  machineId: string,
) {
  const machine = machineInWorkspace(draft, machineId);
  if (
    conversation.machineIds.includes(machineId) ||
    conversation.requests.some(
      (r) => r.machineId === machineId && r.status === "pending",
    )
  )
    return;
  if (["completed", "cancelled"].includes(conversation.status))
    throw new Error("Start a new conversation to request computer access.");
  if (
    conversation.computerAccess === "workspace" &&
    draft.control[machineId] !== "human"
  ) {
    grantComputer(draft, conversation, machineId);
    conversation.messages.push({
      role: "assistant",
      content:
        "Using **" +
        machine.name +
        "** under the workspace-computer permission you granted this conversation." +
        (liveAgentsEnabled ? "" : " This is a simulated allocation."),
    });
  } else {
    conversation.requests.push({ id: id(), machineId, status: "pending" });
    conversation.messages.push({
      role: "assistant",
      content:
        "I need your permission to use **" +
        machine.name +
        "** for this work. You can allow access below, or choose a different computer.",
    });
  }
}
function provision(
  draft: OrbitState,
  input: CreateMachineInput,
  count: number,
  legacyProjectId = "",
) {
  const parsed = CreateMachineInputSchema.parse(input);
  if (!Number.isInteger(count) || count < 1 || count > 10)
    throw new Error("Create between 1 and 10 computers.");
  const created: string[] = [];
  for (let index = 0; index < count; index++) {
    const machineId = id();
    created.push(machineId);
    const baseName = parsed.name + (count > 1 ? " " + (index + 1) : "");
    let name = baseName,
      suffix = 2;
    while (
      draft.machines.some(
        (m) =>
          (cloudComputersEnabled ? m.provider === "daytona" : !m.provider) &&
          (m.workspaceId ??
            draft.projects.find((p) => p.id === m.projectId)?.workspaceId) ===
            draft.workspaceId &&
          m.name === name,
      )
    )
      name = baseName + " (" + suffix++ + ")";
    draft.machines.push({
      ...parsed,
      id: machineId,
      workspaceId: draft.workspaceId,
      projectId: legacyProjectId,
      name,
      osLabel: {
        ubuntu: "Ubuntu 24.04",
        windows: "Windows 11",
        macos: "macOS",
      }[parsed.os],
      status: "running",
      lastSeenAt: now(),
    });
    draft.files[machineId] = {
      "README.md":
        "# " + parsed.name + "\n\nPersistent workspace for your agent.\n",
    };
    addActivity(
      draft,
      legacyProjectId,
      machineId,
      "Computer created",
      "Prototype computer ready",
    );
  }
  return created;
}
// Ephemeral desktop-input leases are not persisted and never authorize a cloud
// operation. The backend must enforce the same coordination per remote session.
const inputLeases = new Map<string, { token: string }>();
const deletingConversations = new Set<string>();
export const isConversationDeleting = (id: string) =>
  deletingConversations.has(id);
const inputPausedRuns = new Set<string>();
export const orbitActions = {
  beginAgentRun(workspaceId: string, run: AgentRun) {
    update((d) => {
      if (d.workspaceId !== workspaceId)
        throw new Error("The workspace changed before the agent started.");
      const task = taskInWorkspace(d, run.conversationId);
      if (
        task.liveRun &&
        !["completed", "failed", "cancelled"].includes(task.liveRun.status)
      )
        throw new Error("An agent is already active in this conversation.");
      task.liveRun = run;
      task.status = "running";
    });
  },
  receiveAgentRun(workspaceId: string, run: AgentRun) {
    const current = state.tasks.find(
      (t) => t.id === run.conversationId,
    )?.liveRun;
    if (
      current?.id !== run.id ||
      JSON.stringify(current) === JSON.stringify(run)
    )
      return;
    update((d) => {
      const task = d.tasks.find(
        (t) =>
          t.id === run.conversationId &&
          d.projects.some(
            (p) => p.id === t.projectId && p.workspaceId === workspaceId,
          ),
      );
      if (!task || task.liveRun?.id !== run.id) return;
      task.liveRun = run;
      task.messages = [
        ...task.messages.filter((m) => m.runId !== run.id),
        ...run.messages.map((m) => ({ ...m, runId: run.id })),
      ];
      if (!["completed", "cancelled"].includes(task.status))
        task.status = run.status === "running" ? "running" : "paused";
    });
  },
  beginInteraction(machineId: string) {
    const machine = machineInWorkspace(state, machineId);
    if (machine.status !== "running")
      throw new Error("Start the computer first.");
    const existing = inputLeases.get(machineId);
    if (existing) return existing.token;
    const token = id();
    const pausedIds = state.tasks
      .filter((t) => t.status === "running" && t.machineIds.includes(machineId))
      .map((t) => t.id);
    update((d) => {
      d.control[machineId] = "human";
      d.tasks
        .filter((t) => pausedIds.includes(t.id))
        .forEach((t) => {
          t.status = "paused";
        });
    });
    pausedIds.forEach((taskId) => inputPausedRuns.add(taskId));
    inputLeases.set(machineId, { token });
    return token;
  },
  endInteraction(machineId: string, token: string) {
    const lease = inputLeases.get(machineId);
    if (!lease || lease.token !== token) return;
    inputLeases.delete(machineId);
    // This token can only release the lease that the current UI acquired,
    // including during workspace-switch cleanup; it cannot acquire new access.
    update((d) => {
      d.control[machineId] = "agent";
      d.tasks
        .filter((t) => inputPausedRuns.has(t.id))
        .forEach((t) => {
          if (t.status !== "paused") {
            inputPausedRuns.delete(t.id);
            return;
          }
          if (
            t.machineIds.every(
              (mid) =>
                d.control[mid] !== "human" &&
                d.machines.find((m) => m.id === mid)?.status === "running",
            )
          ) {
            t.status = "running";
            inputPausedRuns.delete(t.id);
          }
        });
    });
  },
  switchWorkspace(workspaceId: string) {
    update((d) => {
      if (!d.workspaces.some((w) => w.id === workspaceId))
        throw new Error("Workspace not found.");
      d.workspaceId = workspaceId;
    });
  },
  createWorkspace(name: string) {
    const workspaceId = id();
    update((d) => {
      if (name.trim().length < 2)
        throw new Error("Use at least two characters.");
      d.workspaces.push({ id: workspaceId, name: name.trim() });
      d.workspaceId = workspaceId;
      d.agents.push({
        id: id(),
        workspaceId,
        name: "Fleet agent",
        instructions:
          "Work carefully and request review before external actions.",
        skills: ["terminal", "browser", "files"],
      });
    });
    return workspaceId;
  },
  createProject(name: string, description: string) {
    const projectId = id();
    update((d) => {
      if (name.trim().length < 2)
        throw new Error("Use at least two characters.");
      d.projects.push({
        id: projectId,
        workspaceId: d.workspaceId,
        name: name.trim(),
        description: description.trim(),
        machineCount: 0,
        updatedAt: now(),
      });
    });
    return projectId;
  },
  receiveCloudComputer(workspaceId: string, machine: Machine) {
    const parsed = MachineSchema.parse(machine);
    if (parsed.provider !== "daytona" || parsed.workspaceId !== workspaceId)
      throw new Error("Invalid computer ownership.");
    update((d) => {
      if (!d.workspaces.some((w) => w.id === workspaceId)) return;
      const index = d.machines.findIndex((m) => m.id === parsed.id);
      if (index >= 0) d.machines[index] = parsed;
      else d.machines.push(parsed);
    });
  },
  reconcileCloudComputers(workspaceId: string, machines: Machine[]) {
    const parsed = machines.map((machine) => MachineSchema.parse(machine));
    if (
      parsed.some(
        (m) => m.provider !== "daytona" || m.workspaceId !== workspaceId,
      )
    )
      throw new Error("Invalid computer ownership.");
    update((d) => {
      if (!d.workspaces.some((w) => w.id === workspaceId)) return;
      d.machines = d.machines.filter(
        (m) => m.provider !== "daytona" || m.workspaceId !== workspaceId,
      );
      d.machines.push(...parsed);
    });
  },
  createComputers(input: CreateMachineInput, count = 1) {
    let created: string[] = [];
    update((d) => {
      created = provision(d, input, count);
    });
    return created;
  },
  // Compatibility for older callers. Computers are still workspace resources.
  createFleet(projectId: string, input: CreateMachineInput, count = 1) {
    let created: string[] = [];
    update((d) => {
      projectInWorkspace(d, projectId);
      created = provision(d, input, count, projectId);
    });
    return created;
  },
  machineStatus(machineId: string, status: "running" | "stopped") {
    update((d) => {
      const machine = d.machines.find((m) => m.id === machineId);
      if (!machine) throw new Error("Computer not found.");
      machineInWorkspace(d, machine.id);
      if (machine.provider === "daytona")
        throw new Error("Use the computers API for this computer.");
      machine.status = status;
      machine.lastSeenAt = now();
      if (status === "stopped")
        d.tasks
          .filter(
            (t) => t.status === "running" && t.machineIds.includes(machineId),
          )
          .forEach((t) => {
            t.status = "paused";
            t.events.push({
              title: "Paused · computer stopped",
              timestamp: now(),
            });
          });
      addActivity(
        d,
        machine.projectId,
        machineId,
        status === "running" ? "Computer started" : "Computer stopped",
        "Prototype lifecycle action",
      );
    });
  },
  renameMachine(machineId: string, name: string) {
    update((d) => {
      const machine = d.machines.find((m) => m.id === machineId);
      if (!machine || name.trim().length < 2)
        throw new Error("Enter a valid computer name.");
      machineInWorkspace(d, machine.id);
      if (
        d.machines.some(
          (m) =>
            m.id !== machineId &&
            (m.workspaceId ??
              d.projects.find((p) => p.id === m.projectId)?.workspaceId) ===
              d.workspaceId &&
            m.name === name.trim(),
        )
      )
        throw new Error("A computer with that name already exists.");
      machine.name = name.trim();
    });
  },
  setControl(machineId: string, control: "agent" | "human") {
    update((d) => {
      const machine = d.machines.find((m) => m.id === machineId);
      if (!machine) throw new Error("Computer not found.");
      machineInWorkspace(d, machine.id);
      d.control[machineId] = control;
      if (control === "human")
        d.tasks
          .filter(
            (t) => t.status === "running" && t.machineIds.includes(machineId),
          )
          .forEach((t) => {
            t.status = "paused";
            t.events.push({
              title: "Paused · human took control",
              timestamp: now(),
            });
          });
      addActivity(
        d,
        machine.projectId,
        machineId,
        control === "human"
          ? "Human took control"
          : "Control returned to agent",
        "Session handoff",
      );
    });
  },
  saveFile(machineId: string, name: string, content: string) {
    update((d) => {
      const machine = d.machines.find((m) => m.id === machineId);
      if (
        !machine ||
        machine.status !== "running" ||
        d.control[machineId] !== "human"
      )
        throw new Error(
          "Start the computer and interact with its desktop to edit files.",
        );
      machineInWorkspace(d, machine.id);
      if (!name.trim()) throw new Error("Enter a filename.");
      d.files[machineId] ??= {};
      d.files[machineId][name.trim()] = content;
      addActivity(
        d,
        machine.projectId,
        machineId,
        "Saved " + name,
        "Workspace file updated",
      );
    });
  },
  saveAgent(input: Omit<OrbitAgent, "workspaceId" | "id">, agentId?: string) {
    update((d) => {
      input = z
        .object({
          name: z.string().trim().min(1).max(60),
          instructions: z.string().max(16000),
          skills: z.array(z.enum(["terminal", "browser", "files"])).max(3),
          mcpServerIds: z.array(z.string().uuid()).max(20).optional(),
        })
        .parse(input);
      const existing = d.agents.find(
        (a) => a.id === agentId && a.workspaceId === d.workspaceId,
      );
      if (agentId && !existing)
        throw new Error("This profile no longer exists in this workspace.");
      if (existing) Object.assign(existing, input);
      else d.agents.push({ ...input, id: id(), workspaceId: d.workspaceId });
    });
  },
  // Conversations can begin before a computer exists. Allocation is a separate action.
  openConversation(conversationId: string) {
    update((d) => {
      taskInWorkspace(d, conversationId);
      d.activeConversations[d.workspaceId] = conversationId;
    });
  },
  async deleteConversation(conversationId: string) {
    const workspaceId = state.workspaceId;
    const task = taskInWorkspace(state, conversationId);
    if (deletingConversations.has(conversationId))
      throw new Error("This conversation is being deleted.");
    deletingConversations.add(conversationId);
    try {
      if (task.liveRun && liveAgentsEnabled) {
        const { liveAgents } = await import("./live-agents");
        await liveAgents.deleteConversation(workspaceId, conversationId);
      }
      if (state.workspaceId !== workspaceId)
        throw new Error("Workspace changed; try again.");
      let attachments: ChatAttachment[] = [];
      update((d) => {
        const conversation = taskInWorkspace(d, conversationId);
        d.tasks = d.tasks.filter((t) => t.id !== conversationId);
        if (d.activeConversations[workspaceId] === conversationId)
          delete d.activeConversations[workspaceId];
        const retained = new Set(
          d.tasks.flatMap((t) =>
            t.messages.flatMap((m) => (m.attachments ?? []).map((a) => a.id)),
          ),
        );
        attachments = conversation.messages
          .flatMap((m) => m.attachments ?? [])
          .filter((a) => !retained.has(a.id));
      });
      inputPausedRuns.delete(conversationId);
      try {
        await removeAttachments(workspaceId, attachments);
      } catch {
        persistenceError =
          "Session deleted, but its local attachments could not be removed.";
      }
    } finally {
      deletingConversations.delete(conversationId);
    }
  },
  async deleteProject(projectId: string) {
    const workspace = state.workspaceId;
    projectInWorkspace(state, projectId);
    const tasks = state.tasks.filter((t) => t.projectId === projectId);
    if (tasks.some((t) => deletingConversations.has(t.id)))
      throw new Error("A session in this folder is already being deleted.");
    tasks.forEach((t) => deletingConversations.add(t.id));
    try {
      if (liveAgentsEnabled) {
        const { liveAgents } = await import("./live-agents");
        for (const task of tasks)
          if (task.liveRun)
            await liveAgents.deleteConversation(workspace, task.id);
      }
      if (workspace !== state.workspaceId)
        throw new Error("Workspace changed; try again.");
      let attachments: ChatAttachment[] = [];
      update((d) => {
        projectInWorkspace(d, projectId);
        const ids = new Set(tasks.map((t) => t.id));
        if (d.tasks.some((t) => t.projectId === projectId && !ids.has(t.id)))
          throw new Error(
            "A new session was added. Try deleting the folder again.",
          );
        d.tasks = d.tasks.filter((t) => !ids.has(t.id));
        d.projects = d.projects.filter((p) => p.id !== projectId);
        d.schedules = d.schedules.filter((s) => s.projectId !== projectId);
        d.activity = d.activity.filter((a) => a.projectId !== projectId);
        d.messages = d.messages.filter((m) => m.projectId !== projectId);
        if (ids.has(d.activeConversations[workspace] ?? ""))
          delete d.activeConversations[workspace];
        d.machines.forEach((m) => {
          if (m.projectId === projectId) {
            m.workspaceId ??= workspace;
            m.projectId = "";
          }
        });
        const retained = new Set(
          d.tasks.flatMap((t) =>
            t.messages.flatMap((m) => (m.attachments ?? []).map((a) => a.id)),
          ),
        );
        attachments = tasks
          .flatMap((t) => t.messages.flatMap((m) => m.attachments ?? []))
          .filter((a) => !retained.has(a.id));
      });
      tasks.forEach((t) => inputPausedRuns.delete(t.id));
      try {
        await removeAttachments(workspace, attachments);
      } catch {
        persistenceError =
          "Folder deleted, but some local attachments could not be removed.";
      }
    } finally {
      tasks.forEach((t) => deletingConversations.delete(t.id));
    }
  },
  renameConversation(
    conversationId: string,
    title: string,
    source: "manual" | "generated" = "manual",
    workspace = state.workspaceId,
  ) {
    if (workspace !== state.workspaceId) return;
    update((d) => {
      const task = taskInWorkspace(d, conversationId);
      if (source === "generated" && task.titleSource === "manual") return;
      if (!title.trim() || title.trim().length > 55)
        throw new Error("Use a title between 1 and 55 characters.");
      task.title = title.trim();
      task.titleSource = source;
    });
  },
  setConversationModel(conversationId: string, model: string) {
    update((d) => {
      const task = taskInWorkspace(d, conversationId);
      if (
        task.liveRun &&
        !["completed", "failed", "cancelled"].includes(task.liveRun.status)
      )
        throw new Error("Stop the current run before switching models.");
      task.model = model;
    });
  },
  deleteAgent(agentId: string) {
    update((d) => {
      if (d.tasks.some((t) => t.agentId === agentId))
        throw new Error(
          "This profile is used by a conversation. Change its profile before deleting it.",
        );
      d.agents = d.agents.filter(
        (a) => a.id !== agentId || a.workspaceId !== d.workspaceId,
      );
    });
  },
  setConversationAgent(conversationId: string, agentId: string) {
    update((d) => {
      const task = taskInWorkspace(d, conversationId);
      if (
        task.liveRun &&
        !["completed", "failed", "cancelled"].includes(task.liveRun.status)
      )
        throw new Error("Stop the current run before switching profiles.");
      if (
        !d.agents.some(
          (a) => a.id === agentId && a.workspaceId === d.workspaceId,
        )
      )
        throw new Error("Choose a profile in this workspace.");
      task.agentId = agentId;
    });
  },
  newConversation() {
    update((d) => {
      delete d.activeConversations[d.workspaceId];
    });
  },
  createSession(projectId: string) {
    const sessionId = id();
    update((d) => {
      projectInWorkspace(d, projectId);
      const agent = d.agents.find((a) => a.workspaceId === d.workspaceId);
      if (!agent) throw new Error("Create an agent in this workspace first.");
      d.tasks.unshift({
        id: sessionId,
        projectId,
        agentId: agent.id,
        title: "New session",
        prompt: "",
        machineIds: [],
        computerAccess: "ask",
        requests: [],
        status: "paused",
        step: 0,
        createdAt: now(),
        events: [],
        artifacts: [],
        messages: [],
      });
      d.activeConversations[d.workspaceId] = sessionId;
    });
    return sessionId;
  },
  createConversation(
    projectId: string,
    agentId: string,
    prompt: string,
    mentionedComputerIds: string[] = [],
    attachments: ChatAttachment[] = [],
  ) {
    const conversationId = id();
    update((d) => {
      projectInWorkspace(d, projectId);
      if (
        !d.agents.some(
          (a) => a.id === agentId && a.workspaceId === d.workspaceId,
        )
      )
        throw new Error("Choose an agent in this workspace.");
      if (!prompt.trim())
        throw new Error("Tell your agent what you want to work on.");
      d.tasks.unshift({
        id: conversationId,
        projectId,
        agentId,
        title: fallbackTitle([{ role: "user", content: prompt }]),
        prompt: prompt.trim(),
        machineIds: [],
        computerAccess: "ask",
        requests: [],
        status: "paused",
        step: 0,
        createdAt: now(),
        events: [],
        artifacts: [],
        messages: [
          { role: "user", content: prompt.trim(), attachments },
          ...(!liveAgentsEnabled
            ? [
                {
                  role: "assistant",
                  content:
                    "Let’s work on this together. Attach an existing computer or create one below, and you can inspect its desktop alongside our conversation. This is a local preview: responses and execution are simulated until the agent backend is connected.",
                } as const,
              ]
            : []),
        ],
      });
      d.activeConversations[d.workspaceId] = conversationId;
      mentionedComputerIds.forEach((mid) =>
        requestComputer(d, d.tasks[0]!, mid),
      );
    });
    return conversationId;
  },
  attachComputers(conversationId: string, machineIds: string[]) {
    update((d) => {
      const conversation = taskInWorkspace(d, conversationId);
      if (["completed", "cancelled"].includes(conversation.status))
        throw new Error("Start a new conversation to assign more computers.");
      validateAssignment(
        d,
        conversation.projectId,
        conversation.agentId,
        machineIds,
      );
      const added = [...new Set(machineIds)].filter(
        (mid) => !conversation.machineIds.includes(mid),
      );
      if (
        d.tasks.some(
          (t) =>
            t.id !== conversation.id &&
            ["running", "paused", "review"].includes(t.status) &&
            t.machineIds.some((mid) => added.includes(mid)),
        )
      )
        throw new Error("That computer is busy in another conversation.");
      conversation.machineIds.push(...added);
      if (added.length) {
        conversation.messages.push({
          role: "assistant",
          content:
            "Added " +
            added
              .map((mid) => d.machines.find((m) => m.id === mid)!.name)
              .join(", ") +
            ". Open a desktop to follow along. Start stopped computers to continue. You can interact directly whenever you need.",
        });
        conversation.events.push({
          title: "Computers attached",
          timestamp: now(),
        });
      }
    });
  },
  createTask(input: {
    projectId: string;
    agentId: string;
    machineIds: string[];
    prompt: string;
  }) {
    let taskId = "";
    update((d) => {
      taskId = startTask(d, input);
      d.activeConversations[d.workspaceId] = taskId;
    });
    return taskId;
  },
  message(
    taskId: string,
    content: string,
    mentionedComputerIds: string[] = [],
    attachments: ChatAttachment[] = [],
  ) {
    update((d) => {
      const task = taskInWorkspace(d, taskId);
      if (deletingConversations.has(taskId))
        throw new Error("This conversation is being deleted.");
      if (!content.trim()) return;
      if (!task.prompt) {
        task.prompt = content.trim();
      }
      task.messages.push({
        role: "user",
        content: content.trim(),
        attachments,
      });
      if (!task.titleSource || task.titleSource === "automatic") {
        task.title = fallbackTitle(task.messages);
        task.titleSource = "automatic";
      }
      mentionedComputerIds.forEach((mid) => requestComputer(d, task, mid));
      if (
        !mentionedComputerIds.length &&
        !task.machineIds.length &&
        task.computerAccess === "workspace"
      ) {
        const machine = d.machines.find(
          (m) =>
            (cloudComputersEnabled ? m.provider === "daytona" : !m.provider) &&
            (m.workspaceId ??
              d.projects.find((p) => p.id === m.projectId)?.workspaceId) ===
              d.workspaceId &&
            d.control[m.id] !== "human" &&
            !d.tasks.some(
              (t) =>
                ["running", "paused", "review"].includes(t.status) &&
                t.machineIds.includes(m.id),
            ),
        );
        if (machine) requestComputer(d, task, machine.id);
      }
      if (!liveAgentsEnabled)
        task.messages.push({
          role: "assistant",
          content:
            "Your instructions are saved with our conversation. This prototype records context; a connected agent will respond and act on it.",
        });
    });
  },
  requestAvailableComputer(conversationId: string) {
    update((d) => {
      const conversation = taskInWorkspace(d, conversationId);
      const machine = d.machines.find(
        (m) =>
          (cloudComputersEnabled ? m.provider === "daytona" : !m.provider) &&
          (m.workspaceId ??
            d.projects.find((p) => p.id === m.projectId)?.workspaceId) ===
            d.workspaceId &&
          d.control[m.id] !== "human" &&
          !d.tasks.some(
            (t) =>
              ["running", "paused", "review"].includes(t.status) &&
              t.machineIds.includes(m.id),
          ),
      );
      if (!machine)
        throw new Error(
          "No available computer. Create one or finish another run first.",
        );
      requestComputer(d, conversation, machine.id);
    });
  },
  setComputerAccess(conversationId: string, access: "ask" | "workspace") {
    update((d) => {
      taskInWorkspace(d, conversationId).computerAccess = access;
    });
  },
  resolveComputerRequest(
    conversationId: string,
    requestId: string,
    allow: boolean,
  ) {
    update((d) => {
      const conversation = taskInWorkspace(d, conversationId);
      if (["completed", "cancelled"].includes(conversation.status))
        throw new Error("This run has ended.");
      const request = conversation.requests.find(
        (r) => r.id === requestId && r.status === "pending",
      );
      if (!request) throw new Error("Request is no longer pending.");
      if (allow) grantComputer(d, conversation, request.machineId);
      request.status = allow ? "allowed" : "denied";
      conversation.messages.push({
        role: "assistant",
        content: allow
          ? liveAgentsEnabled
            ? "Access granted for this conversation. The agent can now use this computer."
            : "Access granted for this conversation. Open the computer to follow along, then continue the demo when you’re ready."
          : "Understood. I won’t use that computer. Mention another or attach one you’re comfortable sharing.",
      });
    });
  },
  taskAction(
    taskId: string,
    action: "pause" | "resume" | "advance" | "approve" | "cancel",
  ) {
    update((d) => {
      const task = taskInWorkspace(d, taskId);
      if (["completed", "cancelled"].includes(task.status))
        throw new Error("This task has ended.");
      if (action === "cancel") {
        task.status = "cancelled";
        task.events.push({
          title: "Task cancelled · computers retained",
          timestamp: now(),
        });
        return;
      }
      if (action === "pause" && task.status === "running")
        task.status = "paused";
      else if (action === "resume" && task.status === "paused") {
        if (!task.machineIds.length)
          throw new Error("Attach a computer first.");
        if (
          task.machineIds.some(
            (mid) =>
              d.control[mid] === "human" ||
              d.machines.find((m) => m.id === mid)?.status !== "running",
          )
        )
          throw new Error(
            "Start all assigned computers and finish interacting with their desktops first.",
          );
        task.status = "running";
      } else if (action === "advance" && task.status === "running") {
        task.step += 1;
        const title =
          task.step === 1
            ? "Workspace prepared"
            : task.step === 2
              ? "Example work recorded"
              : "Results ready for review";
        task.events.push({ title, timestamp: now() });
        const mid = task.machineIds[0];
        const tool =
          task.step === 1
            ? {
                name: "terminal" as const,
                input: "pwd && ls -la",
                output:
                  "/workspace\n" + Object.keys(d.files[mid!] ?? {}).join("\n"),
                machineId: mid,
              }
            : task.step === 2
              ? {
                  name: "search" as const,
                  input: task.prompt,
                  output:
                    "Example search preview. No external search was performed. Real search results and sources will stream here.",
                  machineId: mid,
                }
              : {
                  name: "files" as const,
                  input: "write /workspace/run-summary.md",
                  output: "Example summary saved to the attached computers.",
                  machineId: mid,
                };
        task.messages.push({ role: "assistant", content: title, tool });
        if (task.step >= 3)
          task.messages.push({
            role: "assistant",
            content:
              "**Ready for review.**\n\n- Collected the demo output on your computers.\n- Saved `run-summary.md` to the workspace.\n\nThis is a simulated result, not completed real-world work.",
          });
        task.machineIds.forEach((mid) =>
          addActivity(
            d,
            task.projectId,
            mid,
            title,
            "Demo task: " + task.title,
          ),
        );
        if (task.step >= 3) {
          task.status = "review";
          task.artifacts = [
            {
              name: "run-summary.md",
              content:
                "# Demo run summary\n\nTask: " +
                task.prompt +
                "\n\nComputers: " +
                task.machineIds
                  .map((mid) => d.machines.find((m) => m.id === mid)?.name)
                  .join(", ") +
                "\n\nThis artifact demonstrates the review flow. Real execution will be connected by the backend.\n",
            },
          ];
          task.machineIds.forEach((mid) => {
            d.files[mid] ??= {};
            d.files[mid]["run-summary.md"] = task.artifacts[0]!.content;
          });
        }
      } else if (action === "approve" && task.status === "review") {
        task.status = "completed";
        task.events.push({ title: "Results approved", timestamp: now() });
      } else throw new Error("That action is not available for this task.");
    });
  },
  saveSchedule(input: Omit<Schedule, "id" | "enabled">) {
    update((d) => {
      validateAssignment(d, input.projectId, input.agentId, input.machineIds);
      if (!input.prompt.trim() || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))
        throw new Error("Add a task and valid time.");
      d.schedules.push({ ...input, id: id(), enabled: true });
    });
  },
  toggleSchedule(scheduleId: string) {
    update((d) => {
      const schedule = d.schedules.find((s) => s.id === scheduleId);
      if (!schedule) return;
      projectInWorkspace(d, schedule.projectId);
      schedule.enabled = !schedule.enabled;
    });
  },
  runSchedule(scheduleId: string) {
    let taskId = "";
    update((d) => {
      const schedule = d.schedules.find((s) => s.id === scheduleId);
      if (!schedule) throw new Error("Schedule not found.");
      taskId = startTask(d, schedule);
      d.activeConversations[d.workspaceId] = taskId;
    });
    return taskId;
  },
  settings(input: OrbitState["settings"]) {
    update((d) => {
      d.settings = input;
    });
  },
};
