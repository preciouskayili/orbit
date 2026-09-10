import { AgentRunSchema, StartAgentRunSchema, type AgentControl, type AgentRun } from "@orbit/shared";
import { getOrbitState, orbitActions, type Task } from "./orbit-store";

const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
export const agentActive = (task?: Task) => Boolean(task?.liveRun && !["completed", "cancelled", "failed"].includes(task.liveRun.status));
class AgentRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
async function request(workspaceId: string, path: string, body?: unknown): Promise<AgentRun> {
  const token = import.meta.env.VITE_ORBIT_API_TOKEN;
  if (!token) throw new AgentRequestError("Set VITE_ORBIT_API_TOKEN to connect the agent to the local API.", 401);
  const response = await fetch(`${base}/api/workspaces/${encodeURIComponent(workspaceId)}/agent-runs${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok) throw new AgentRequestError(result.message || "Agent request failed.", response.status);
  return AgentRunSchema.parse(result);
}
const starting = new Set<string>();
// Serialize controls and polling so a delayed heartbeat cannot overwrite a
// newer pause/cancel result. Navigation does not own the server run.
const queues = new Map<string, Promise<unknown>>();
function enqueue<T>(id: string, operation: () => Promise<T>): Promise<T> {
  const next = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(operation);
  queues.set(id, next);
  void next.finally(() => { if (queues.get(id) === next) queues.delete(id); }).catch(() => {});
  return next;
}
export const liveAgents = {
  async start(conversationId: string) {
    if (starting.has(conversationId)) return;
    const state = getOrbitState();
    const task = state.tasks.find((t) => t.id === conversationId && state.projects.some((p) => p.id === t.projectId && p.workspaceId === state.workspaceId));
    if (!task || !task.messages.some((m) => m.role === "user")) throw new Error("Send a message first.");
    if (agentActive(task)) throw new Error("Pause or stop the active run before starting another turn.");
    if (["completed", "cancelled"].includes(task.status)) throw new Error("Start a new conversation to run an agent.");
    if (task.requests.some((r) => r.status === "pending")) return;
    const agent = state.agents.find((a) => a.id === task.agentId && a.workspaceId === state.workspaceId);
    if (!agent) throw new Error("Choose an agent in this workspace.");
    if (task.messages.at(-1)?.attachments?.length) throw new Error("Attachments are stored locally. Put the file on an attached computer and tell the agent its path.");
    const messages = task.messages.filter((m) => m.role === "user" || m.runId).map((m) => ({
      role: m.role,
      content: m.tool ? `${m.content}\nEarlier ${m.tool.name} tool on ${m.tool.machineId}:\n${m.tool.input}\n${m.tool.output}` : m.content,
    })).slice(-120);
    let size = messages.reduce((total, m) => total + m.content.length, 0);
    while (size > 400_000 && messages.length > 1) size -= messages.shift()!.content.length;
    const input = StartAgentRunSchema.parse({ requestId: crypto.randomUUID(), conversationId, instructions: agent.instructions, skills: agent.skills, machineIds: task.machineIds, messages });
    const workspaceId = state.workspaceId;
    const initial: AgentRun = { id: input.requestId, conversationId, status: "running", messages: [] };
    orbitActions.beginAgentRun(workspaceId, initial);
    starting.add(conversationId);
    try {
      const result = await request(workspaceId, "", input);
      orbitActions.receiveAgentRun(workspaceId, result);
    } catch (error) {
      if (error instanceof AgentRequestError) {
        orbitActions.receiveAgentRun(workspaceId, { ...initial, status: "failed", error: error.message });
      } else {
        // A lost POST response does not mean the run was rejected. Poll its
        // stable ID before allowing another run that could repeat side effects.
        orbitActions.receiveAgentRun(workspaceId, { ...initial, status: "waiting", error: "Connection interrupted. Reconnecting to the existing run…" });
      }
    } finally { starting.delete(conversationId); }
  },
  async control(workspaceId: string, runId: string, action: AgentControl) {
    return enqueue(runId, async () => {
      const result = await request(workspaceId, "/" + encodeURIComponent(runId), action);
      orbitActions.receiveAgentRun(workspaceId, result);
    });
  },
  async poll(workspaceId: string, task: Task) {
    const run = task.liveRun;
    if (!run || starting.has(task.id) || queues.has(run.id)) return;
    try {
      await this.control(workspaceId, run.id, { action: "heartbeat", humanMachineIds: task.machineIds.filter((id) => getOrbitState().control[id] === "human") });
    } catch (error) {
      const current = getOrbitState().tasks.find((t) => t.id === task.id)?.liveRun;
      if (!current || current.id !== run.id) return;
      const gone = error instanceof AgentRequestError && [401, 403, 404, 503].includes(error.status);
      orbitActions.receiveAgentRun(workspaceId, { ...current, status: gone ? "failed" : current.status, error: gone ? error.message : "Connection interrupted. The agent waits when its heartbeat expires; reconnecting…" });
    }
  },
};
