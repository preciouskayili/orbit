import {
  ActivityResponseSchema,
  AgentMessagesResponseSchema,
  CreateMachineInputSchema,
  MachineSchema,
  MachinesResponseSchema,
  ProjectSchema,
  ProjectsResponseSchema,
  type CreateMachineInput,
} from "@orbit/shared";
const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:4000";

async function request<T>(
  path: string,
  schema: { parse: (value: unknown) => T },
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Orbit API request failed (${response.status})`);
  }

  return schema.parse(await response.json());
}

export const orbitApi = {
  projects: () => request("/api/projects", ProjectsResponseSchema),
  project: (projectId: string) => request(`/api/projects/${projectId}`, ProjectSchema),
  machines: (projectId: string) =>
    request(`/api/projects/${projectId}/machines`, MachinesResponseSchema),
  machine: (machineId: string) => request(`/api/machines/${machineId}`, MachineSchema),
  activity: (projectId: string) =>
    request(`/api/projects/${projectId}/activity`, ActivityResponseSchema),
  messages: (projectId: string) =>
    request(`/api/projects/${projectId}/messages`, AgentMessagesResponseSchema),
  createMachine: (projectId: string, input: CreateMachineInput) =>
    request(`/api/projects/${projectId}/machines`, MachineSchema, {
      method: "POST",
      body: JSON.stringify(CreateMachineInputSchema.parse(input)),
    }),
};
