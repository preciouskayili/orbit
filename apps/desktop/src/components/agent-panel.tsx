import { useMemo, useState, type FormEvent } from "react";
import {
  ArrowUp,
  Robot as Bot,
  Check,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Circle,
  Folder,
  Laptop,
  Microphone as Mic,
  DotsThree as MoreHorizontal,
  SidebarSimple as PanelLeftClose,
  Plus,
  Sparkle as Sparkles,
  TerminalWindow as TerminalSquare,
} from "@/components/ui/icons";
import type { AgentMessage } from "@orbit/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgentMessages } from "@/hooks/queries";

interface AgentPanelProps {
  projectId: string;
  width: number;
  collapsed: boolean;
  onToggle: () => void;
}

const computerRuns = [
  { name: "Ubuntu Dev", task: "51 tests passed", done: true },
  { name: "Windows QA", task: "Reviewing the returns flow", done: false },
  { name: "Mac Build", task: "Waiting to sign the artifact", done: false },
];

export function AgentPanel({ projectId, width, collapsed, onToggle }: AgentPanelProps) {
  const { data: messages = [] } = useAgentMessages(projectId);
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState<AgentMessage[]>([]);
  const initialPrompt = messages.find((message) => message.role === "user")?.content;
  const visibleLocalMessages = useMemo(() => localMessages.slice(-2), [localMessages]);

  if (collapsed) {
    return (
      <aside className="flex w-12 shrink-0 flex-col items-center bg-[#181818]">
        <Tooltip>
          <TooltipTrigger onClick={onToggle} className="mt-3 flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><ChevronRight className="size-4" /></TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-100 text-zinc-900">Show conversation</TooltipContent>
        </Tooltip>
      </aside>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setLocalMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        projectId,
        machineId: null,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
    setDraft("");
  };

  return (
    <aside style={{ width }} className="relative flex shrink-0 flex-col bg-[#181818]">
      <header className="window-drag flex h-[54px] shrink-0 items-center bg-[#1a1a1a] px-4">
        <TerminalSquare className="size-[17px] text-[#db7657]" />
        <div className="ml-2 min-w-0">
          <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-zinc-200">Release verification</p>
        </div>
        <Badge variant="secondary" className="ml-2 h-5 rounded-full bg-emerald-400/10 px-2 text-[10px] font-medium text-emerald-300">Running</Badge>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><MoreHorizontal className="size-4" /></Button>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200" />} onClick={onToggle}><PanelLeftClose className="size-4" /></TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">Hide conversation</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-[190px] pt-8">
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl rounded-br-md bg-white/[0.065] px-4 py-3 text-[13px] leading-5 text-zinc-300">
            {initialPrompt ?? "Prepare the release across the fleet and keep the computers attached while you work."}
          </div>
        </div>

        <article className="agent-prose mt-8 text-[13px] leading-[1.65] text-zinc-400">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded-lg bg-[#e8e8e8] text-[#282828]"><Sparkles className="size-3.5" /></span>
            <span className="text-[13px] font-medium text-zinc-200">Orbit Agent</span>
            <Badge variant="secondary" className="h-5 rounded-full bg-white/[0.065] px-2 text-[10px] font-normal text-zinc-400">Fleet agent</Badge>
          </div>

          <p>I split the release across three persistent computers so the checks can run in parallel.</p>

          <div className="my-5 overflow-hidden rounded-xl bg-white/[0.035]">
            <div className="flex items-center bg-white/[0.025] px-3.5 py-2.5">
              <span className="agent-pulse size-1.5 rounded-full bg-[#db7657]" />
              <span className="ml-2 text-[11px] font-medium text-zinc-300">Fleet run</span>
              <span className="ml-auto text-[10px] text-zinc-600">3 computers</span>
            </div>
            <div className="p-1.5">
              {computerRuns.map((run) => (
                <div key={run.name} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 hover:bg-white/[0.025]">
                  <span className="flex size-7 items-center justify-center rounded-md bg-white/[0.045] text-zinc-500"><Laptop className="size-3.5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-[12px] font-medium text-zinc-300">{run.name}</span><span className="mt-0.5 block truncate text-[10px] text-zinc-600">{run.task}</span></span>
                  {run.done ? <Check className="size-4 text-emerald-400" /> : <Circle className="agent-pulse size-2 fill-[#db7657] text-[#db7657]" />}
                </div>
              ))}
            </div>
          </div>

          <p><strong>Ubuntu is clean.</strong> The full suite and typecheck passed. Windows has the final browser action open for review, and the macOS artifact is staged until signing access is available.</p>
          <p>You can open any computer on the right, take control, then hand it back without interrupting the rest of the run.</p>
          <p className="flex items-center gap-1.5 text-[10px] text-zinc-600"><Sparkles className="size-3 text-[#db7657]" /> Orbit 1 · just now</p>
        </article>

        {visibleLocalMessages.map((message) => (
          <div key={message.id} className="mt-6 flex justify-end">
            <span className="max-w-[88%] rounded-2xl rounded-br-md bg-white/[0.065] px-4 py-3 text-[13px] leading-5 text-zinc-300">{message.content}</span>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#171717] via-[#171717] to-transparent px-5 pb-3 pt-10">
        <form onSubmit={submit} className="rounded-2xl bg-[#262626] p-3 shadow-[0_18px_48px_rgba(0,0,0,.4)] transition-colors focus-within:bg-[#2a2a2a]">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Message Orbit"
            className="h-[52px] w-full resize-none bg-transparent px-1 text-[13px] leading-5 text-zinc-200 outline-none placeholder:text-zinc-600"
          />
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="ghost" size="icon-xs" className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><Plus className="size-4" /></Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] text-zinc-400 hover:bg-white/[0.055] hover:text-zinc-200"><Bot className="size-3.5" /> Fleet agent <ChevronDown className="size-3" /></DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-44 bg-[#292a2c] p-1.5 text-zinc-200"><DropdownMenuItem className="px-2 py-2 text-[12px] focus:bg-white/[0.07] focus:text-white">Fleet agent</DropdownMenuItem><DropdownMenuItem className="px-2 py-2 text-[12px] focus:bg-white/[0.07] focus:text-white">Personal agent</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
            <button type="button" className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] text-zinc-500 hover:bg-white/[0.055] hover:text-zinc-200"><Sparkles className="size-3.5 text-[#db7657]" /> Orbit 1 <ChevronDown className="size-3" /></button>
            <Button type="button" variant="ghost" size="icon-xs" className="ml-auto text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"><Mic className="size-4" /></Button>
            <Button type="submit" size="icon-sm" disabled={!draft.trim()} className="rounded-full bg-zinc-200 text-zinc-900 hover:bg-white"><ArrowUp className="size-4" /></Button>
          </div>
        </form>

        <div className="mt-2 flex h-6 items-center justify-center gap-6 text-[10px] text-zinc-600">
          <button className="flex items-center gap-1.5 hover:text-zinc-300"><Laptop className="size-3.5" /> Precious&apos;s MacBook Pro <ChevronDown className="size-3" /></button>
          <button className="flex items-center gap-1.5 hover:text-zinc-300"><Folder className="size-3.5" /> Trace <ChevronDown className="size-3" /></button>
        </div>
      </div>
    </aside>
  );
}
