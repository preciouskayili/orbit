import { z } from "zod";

export const MachineOSSchema = z.enum(["ubuntu", "windows", "macos"]);
export type MachineOS = z.infer<typeof MachineOSSchema>;

export const MachineStatusSchema = z.enum([
  "running",
  "stopped",
  "starting",
  "stopping",
  "error",
]);
export type MachineStatus = z.infer<typeof MachineStatusSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  machineCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const MachineSchema = z.object({
  id: z.string(),
  // Computers belong to workspaces. projectId is a legacy creation hint only.
  workspaceId: z.string().optional(),
  provider: z.literal("daytona").optional(),
  projectId: z.string(),
  name: z.string(),
  os: MachineOSSchema,
  osLabel: z.string(),
  status: MachineStatusSchema,
  cpu: z.number().int().positive(),
  ramGb: z.number().int().positive(),
  storageGb: z.number().int().positive(),
  lastSeenAt: z.string().datetime(),
});
export type Machine = z.infer<typeof MachineSchema>;

export const ActivityEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  machineId: z.string().nullable(),
  type: z.enum(["machine", "agent", "file", "system"]),
  title: z.string(),
  detail: z.string(),
  timestamp: z.string().datetime(),
});
export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

export const AgentMessageSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  machineId: z.string().nullable(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string().datetime(),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

export const CreateMachineInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  os: MachineOSSchema,
  cpu: z.coerce.number().int().min(1).max(32),
  ramGb: z.coerce.number().int().min(2).max(128),
  storageGb: z.coerce.number().int().min(1).max(2048),
});
export type CreateMachineInput = z.infer<typeof CreateMachineInputSchema>;

export const ProjectsResponseSchema = z.array(ProjectSchema);
export const MachinesResponseSchema = z.array(MachineSchema);
export const ActivityResponseSchema = z.array(ActivityEventSchema);
export const AgentMessagesResponseSchema = z.array(AgentMessageSchema);

export const IPC_CHANNELS = {
  runtimeInfo: "orbit:runtime:info",
  featureRequest: "orbit:feature:request",
} as const;

export type NativeFeature =
  "clipboard" | "filesystem" | "notifications" | "window-controls";

export interface OrbitDesktopAPI {
  getRuntimeInfo: () => Promise<{ platform: NodeJS.Platform; version: string }>;
  requestFeature: (
    feature: NativeFeature,
  ) => Promise<{ available: false; message: string }>;
}

export const CreateCloudComputerSchema = CreateMachineInputSchema.extend({
  os: z.literal("ubuntu"),
  requestId: z.string().uuid(),
});
export const DesktopSessionSchema = z.object({
  url: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type DesktopSession = z.infer<typeof DesktopSessionSchema>;
