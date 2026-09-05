import { computerMentionParts, computerMention } from "@/lib/computer-mentions";
import { workspaceComputers } from "@/lib/orbit-selectors";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Task } from "@/lib/orbit-store";
import { Terminal, MagnifyingGlass, FileText, CaretRight } from "./ui/icons";
import { useOrbit } from "@/hooks/use-orbit";

export function AgentMessage({
  message,
  agentName,
  showAuthor = true,
}: {
  message: Task["messages"][number];
  agentName: string;
  showAuthor?: boolean;
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
      </div>
    );
  if (message.tool) {
    const tool = message.tool;
    const Icon = {
      terminal: Terminal,
      search: MagnifyingGlass,
      files: FileText,
    }[tool.name];
    return (
      <details className="group overflow-hidden rounded-lg bg-white/[0.025]">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 text-xs text-zinc-400">
          <Icon className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{message.content}</span>
          <span className="text-[10px] text-zinc-600">Demo</span>
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
            {tool.input}
          </pre>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words px-1 text-[11px] leading-5 text-zinc-500">
            {tool.output}
          </pre>
        </div>
      </details>
    );
  }
  return (
    <div className="text-sm leading-6 text-zinc-400">
      {showAuthor && (
        <p className="mb-2 text-xs font-medium text-zinc-200">{agentName}</p>
      )}
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
