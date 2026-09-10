import { computerMentionParts, computerMention } from "@/lib/computer-mentions";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { MessageAttachments } from "./message-attachments";
import { AgentOrb, type AgentPhase } from "./agent-orb";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Task } from "@/lib/orbit-store";
import { Terminal, MagnifyingGlass, FileText, CaretRight, Monitor, CircleNotch } from "./ui/icons";
import { useOrbit } from "@/hooks/use-orbit";

function formatToolInput(name: string, rawInput: string): string {
  try {
    const parsed = JSON.parse(rawInput);
    if (name === "terminal" && typeof parsed.command === "string") {
      return parsed.command;
    }
    if (name === "files") {
      if (typeof parsed.path === "string") {
        if (parsed.content !== undefined) {
          const byteLength = new TextEncoder().encode(parsed.content).length;
          return `write ${parsed.path} (${byteLength} bytes)`;
        }
        return `read ${parsed.path}`;
      }
    }
    if (name === "computer" && parsed.action && typeof parsed.action.type === "string") {
      const act = parsed.action;
      switch (act.type) {
        case "screenshot":
          return "take screenshot";
        case "click":
          return `click (${act.x}, ${act.y})${act.double ? " double" : ""} [${act.button}]`;
        case "move":
          return `move to (${act.x}, ${act.y})`;
        case "drag":
          return `drag (${act.x}, ${act.y}) -> (${act.endX}, ${act.endY})`;
        case "scroll":
          return `scroll ${act.direction} (${act.amount})`;
        case "type":
          return `type "${act.text.length > 60 ? act.text.slice(0, 60) + "…" : act.text}"`;
        case "keypress": {
          const mods = act.modifiers?.length ? act.modifiers.join("+") + "+" : "";
          return `press ${mods}${act.key}`;
        }
        default:
          return act.type;
      }
    }
  } catch {
    // Non-JSON input: keep original representation
  }
  return rawInput;
}

function renderToolStatus(status?: string) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1 text-[10px] text-sky-400">
        <CircleNotch className="size-2.5 animate-spin motion-reduce:animate-none" />
        Running
      </span>
    );
  }
  if (status === "completed") {
    return <span className="text-[10px] text-emerald-400/90">Completed</span>;
  }
  if (status === "failed") {
    return <span className="text-[10px] text-rose-400">Failed</span>;
  }
  return <span className="text-[10px] text-zinc-600">{status ?? "Demo"}</span>;
}

export function AgentMessage({
  message,
  agentName,
  showAuthor = true,
  phase = "idle",
}: {
  message: Task["messages"][number];
  agentName: string;
  showAuthor?: boolean;
  phase?: AgentPhase;
}) {
  const state = useOrbit();
  if (message.role === "user")
    return (
      <div className="ml-8 whitespace-pre-wrap break-words rounded-2xl bg-white/[0.065] px-4 py-3 text-sm leading-6 text-zinc-300">
        {computerMentionParts(message.content, workspaceComputers(state)).map(
          (part, index) =>
            part.machine ? (
              <span
                key={index}
                className="rounded-md bg-sky-400/10 px-1 py-0.5 text-sky-300"
              >
                {computerMention(part.machine)}
              </span>
            ) : (
              part.text
            ),
        )}
        <MessageAttachments
          files={message.attachments ?? []}
          workspaceId={state.workspaceId}
        />
      </div>
    );
  const identity = showAuthor ? (
    <div
      className="mb-3 flex items-center gap-2.5"
      aria-label={agentName + " · " + phase}
    >
      <AgentOrb phase={phase} />
      <span className="text-xs font-medium text-zinc-200">{agentName}</span>
    </div>
  ) : null;
  if (message.tool) {
    const tool = message.tool;
    const Icon = {
      terminal: Terminal,
      search: MagnifyingGlass,
      files: FileText,
      computer: Monitor,
      mcp: Terminal,
    }[tool.name];
    const formattedInput = formatToolInput(tool.name, tool.input);
    return (
      <div>
        {identity}
        <details className="group overflow-hidden rounded-lg bg-white/[0.025]">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs text-zinc-400">
            <Icon className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{message.content}</span>
            {renderToolStatus(tool.status)}
            <CaretRight className="size-3 transition-transform group-open:rotate-90" />
          </summary>
          <div className="px-3 pb-3">
            <p className="mb-2 text-[10px] text-zinc-500">
              {state.machines.find((m) => m.id === tool.machineId)?.name ??
                "Agent"}{" "}
              · {tool.name}
            </p>
            <pre className="overflow-x-auto rounded-lg bg-black/20 p-3 text-[11px] leading-5 text-zinc-300">
              {tool.name === "terminal" ? "$ " : ""}
              {formattedInput}
            </pre>
            {tool.output ? (
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words px-1 text-[11px] leading-5 text-zinc-500">
                {tool.output}
              </pre>
            ) : null}
          </div>
        </details>
      </div>
    );
  }
  return (
    <div className="text-sm leading-6 text-zinc-400">
      {identity}
      <div className="agent-markdown">
        <Markdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            a: ({ children, ...props }) => (
              <a {...props} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
            img: ({ alt }) => (
              <span className="text-zinc-500">[Image: {alt}]</span>
            ),
          }}
        >
          {message.content}
        </Markdown>
      </div>
    </div>
  );
}
