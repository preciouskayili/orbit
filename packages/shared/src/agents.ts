import { z } from "zod";

export const StartAgentRunSchema = z.object({
  requestId: z.string().uuid(),
  conversationId: z.string().min(1).max(100),
  instructions: z.string().max(16000),
  model: z.string().max(120).optional(),
  mcpServerIds: z.array(z.string().uuid()).max(20).optional(),
  skills: z.array(z.enum(["terminal", "browser", "files"])).max(3),
  machineIds: z.array(z.string().min(1).max(100)).max(10),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(64000) })).min(1).max(200),
});
export type StartAgentRun = z.infer<typeof StartAgentRunSchema>;
export const LiveAgentMessageSchema = z.object({
  id: z.string(),
  role: z.literal("assistant"),
  content: z.string(),
  tool: z.object({
    name: z.enum(["terminal", "files", "computer", "mcp"]),
    input: z.string(), output: z.string(), machineId: z.string().optional(),
    status: z.enum(["running", "completed", "failed"]),
  }).optional(),
});
export const AgentRunSchema = z.object({
  id: z.string(), conversationId: z.string(),
  status: z.enum(["running", "paused", "waiting", "completed", "cancelled", "failed"]),
  messages: z.array(LiveAgentMessageSchema),
  approval: z.object({ id: z.string(), description: z.string() }).optional(),
  error: z.string().optional(),
  model: z.string().optional(),
  startedAt: z.string().optional(),
  finishedAt: z.string().optional(),
  metrics: z.object({ modelCalls: z.number(), toolCalls: z.number(), modelMs: z.number(), toolMs: z.number(), inputTokens: z.number(), outputTokens: z.number() }).optional(),
});
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type LiveAgentMessage = z.infer<typeof LiveAgentMessageSchema>;
export const AgentControlSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("heartbeat"), humanMachineIds: z.array(z.string()).max(10) }),
  z.object({ action: z.literal("pause") }),
  z.object({ action: z.literal("resume") }),
  z.object({ action: z.literal("cancel") }),
  z.object({ action: z.literal("approve"), approvalId: z.string(), allow: z.boolean() }),
]);
export type AgentControl = z.infer<typeof AgentControlSchema>;
