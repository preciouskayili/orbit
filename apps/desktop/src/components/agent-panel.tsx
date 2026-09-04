import { useState } from "react";
import { useLocation } from "react-router-dom";
import { CaretRight, SidebarSimple, Robot, ArrowUp } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
export function AgentPanel({ width, collapsed, onToggle }: { projectId: string; width: number; collapsed: boolean; onToggle: () => void }) {
  const state = useOrbit();
  const location = useLocation();
  const taskId = location.pathname.match(/^\/tasks\/([^/]+)/)?.[1];
  const task = state.tasks.find(t => t.id === taskId);
  const [draft, setDraft] = useState("");
  if (!task) return null;
  if (collapsed) return <aside className="w-12 shrink-0 bg-[#181818] p-2"><Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Show conversation"><CaretRight className="size-4" /></Button></aside>;
  return <aside style={{ width }} className="flex min-h-0 shrink-0 flex-col bg-[#181818]">
    <header className="window-drag flex h-[54px] shrink-0 items-center gap-2 bg-[#1a1a1a] px-4"><Robot className="size-4 text-[#db7657]" /><span className="text-sm text-zinc-300">{state.agents.find(a => a.id === task.agentId)?.name}</span><Button variant="ghost" size="icon-sm" className="ml-auto" onClick={onToggle} aria-label="Hide conversation"><SidebarSimple className="size-4" /></Button></header>
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">{task.messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-8 rounded-2xl bg-white/[0.065] p-4 text-sm leading-6 text-zinc-300" : "text-sm leading-6 text-zinc-400"}>{message.role === "assistant" && <p className="mb-2 text-xs font-medium text-zinc-200">Orbit agent</p>}{message.content}</div>)}</div>
    <form className="m-4 rounded-2xl bg-[#262626] p-3" onSubmit={e => { e.preventDefault(); if (draft.trim()) { orbitActions.message(task.id, draft); setDraft(""); } }}>
      <textarea aria-label="Task instructions" className="h-20 w-full resize-none bg-transparent p-1 text-sm text-zinc-200 outline-none placeholder:text-zinc-600" placeholder="Add instructions or context…" value={draft} onChange={e => setDraft(e.target.value)} />
      <div className="flex items-center justify-between"><span className="text-[11px] text-zinc-500">Context persists with this task</span><Button type="submit" size="icon-sm" aria-label="Send instructions" disabled={!draft.trim()}><ArrowUp className="size-4" /></Button></div>
    </form>
  </aside>;
}
