import { MachineSchema, MachinesResponseSchema, DesktopSessionSchema, type CreateMachineInput } from "@orbit/shared";
import { orbitActions, getOrbitState } from "./orbit-store";

const base = (import.meta.env.VITE_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
async function request(workspaceId: string, path = "", method = "GET", body?: unknown) {
  const token = import.meta.env.VITE_ORBIT_API_TOKEN;
  if (!token) throw new Error("Set VITE_ORBIT_API_TOKEN to connect Orbit to its local API.");
  let response: Response;
  try {
    response = await fetch(`${base}/api/workspaces/${encodeURIComponent(workspaceId)}/computers${path}`, {
      method, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(method === "GET" ? 20_000 : 240_000),
    });
  } catch {
    throw new Error("Couldn’t reach the computers API. Check that it is running, then retry. A pending creation may still finish.");
  }
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.message === "string" ? result.message : "Computer request failed.");
  return result;
}
const revision = new Map<string, number>();
function receive(workspaceId: string, machine: ReturnType<typeof MachineSchema.parse>) {
  revision.set(workspaceId, (revision.get(workspaceId) ?? 0) + 1);
  orbitActions.receiveCloudComputer(workspaceId, machine);
}
export const cloudComputers = {
  async get(workspaceId: string, id: string) {
    const machine = MachineSchema.parse(await request(workspaceId, `/${encodeURIComponent(id)}`));
    receive(workspaceId, machine);
  },
  async refresh(workspaceId: string) {
    const startedAt = revision.get(workspaceId) ?? 0;
    const machines = MachinesResponseSchema.parse(await request(workspaceId));
    if (startedAt === (revision.get(workspaceId) ?? 0)) orbitActions.reconcileCloudComputers(workspaceId, machines);
  },
  async create(workspaceId: string, input: CreateMachineInput, requestId: string) {
    const machine = MachineSchema.parse(await request(workspaceId, "", "POST", { ...input, requestId }));
    receive(workspaceId, machine);
    return machine.id;
  },
  async status(id: string, action: "start" | "stop") {
    const workspaceId = getOrbitState().workspaceId;
    const machine = MachineSchema.parse(await request(workspaceId, `/${encodeURIComponent(id)}/${action}`, "POST"));
    receive(workspaceId, machine);
  },
  async rename(id: string, name: string) {
    const workspaceId = getOrbitState().workspaceId;
    const machine = MachineSchema.parse(await request(workspaceId, `/${encodeURIComponent(id)}`, "PATCH", { name }));
    receive(workspaceId, machine);
  },
  async desktop(workspaceId: string, id: string) {
    return DesktopSessionSchema.parse(await request(workspaceId, `/${encodeURIComponent(id)}/desktop`, "POST"));
  },
};
