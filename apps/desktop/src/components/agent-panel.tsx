import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CaretRight, SidebarSimple, Robot, ArrowUp, Plus, Monitor, ChatCircleDots } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateMachineDialog } from "./create-machine-dialog";
import { CreateContainer, ErrorNotice } from "./flow-ui";
import { OsLogo } from "./os-logo";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";

export function AgentPanel({ projectId: routeProjectId, width, collapsed, onToggle }: { projectId: string; width: number; collapsed: boolean; onToggle: () => void }) {
  const state = useOrbit();
  const navigate = useNavigate();
  const projects = state.projects.filter(p => p.workspaceId === state.workspaceId);
  const agents = state.agents.filter(a => a.workspaceId === state.workspaceId);
  const conversation = state.tasks.find(t => t.id === state.activeConversations[state.workspaceId] && projects.some(p => p.id === t.projectId));
  const [chosenProject, setChosenProject] = useState("");
  const [chosenAgent, setChosenAgent] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const projectId = conversation?.projectId ?? projects.find(p => p.id === chosenProject)?.id ?? projects.find(p => p.id === routeProjectId)?.id ?? projects[0]?.id ?? "";
  const agentId = conversation?.agentId ?? agents.find(a => a.id === chosenAgent)?.id ?? agents[0]?.id ?? "";
  const computers = state.machines.filter(m => conversation?.machineIds.includes(m.id));
  const ended = conversation && ["completed", "cancelled"].includes(conversation.status);
  const available = state.machines.filter(m => m.projectId === projectId && !conversation?.machineIds.includes(m.id) && !state.tasks.some(t => ["running", "paused", "review"].includes(t.status) && t.machineIds.includes(m.id)));

  useEffect(() => { bottom.current?.scrollIntoView?.({ block: "end", behavior: "smooth" }); }, [conversation?.messages.length, conversation?.id]);
  useEffect(() => { setDraft(""); setError(""); }, [conversation?.id, state.workspaceId]);
  function act(fn: () => void) { try { fn(); setError(""); } catch (e) { setError((e as Error).message); } }
  function attach(ids: string[]) {
    act(() => {
      const id = conversation?.id ?? orbitActions.createConversation(projectId, agentId, "Let’s set up computers for this project.");
      orbitActions.attachComputers(id, ids);
      navigate("/projects/" + projectId + "/machines/" + ids[0]);
    });
  }
  function send() {
    act(() => {
      if (!draft.trim()) return;
      if (conversation) orbitActions.message(conversation.id, draft);
      else {
        const id = orbitActions.createConversation(projectId, agentId, draft);
        navigate("/sessions/" + id);
      }
      setDraft("");
    });
  }
  if (collapsed) return <aside className="w-12 shrink-0 bg-[#181818] p-2 pt-4"><Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Show agent"><CaretRight className="size-4" /></Button></aside>;
  return <aside style={{ width }} className="flex min-h-0 min-w-[360px] shrink-0 flex-col bg-[#181818]">
    <header className="window-drag flex h-[54px] shrink-0 items-center gap-2 px-4">
      <Robot className="size-4 text-[#db7657]" /><span className="truncate text-sm text-zinc-300">{agents.find(a => a.id === agentId)?.name ?? "Your agent"}</span>
      <Button variant="ghost" size="icon-sm" className="ml-auto" onClick={() => { orbitActions.newConversation(); navigate("/new"); }} aria-label="New conversation"><Plus className="size-4" /></Button>
      <Button variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Hide agent"><SidebarSimple className="size-4" /></Button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
      {!conversation ? <div className="flex min-h-full flex-col justify-center py-8">
        <ChatCircleDots className="mb-5 size-7 text-zinc-500" />
        <h1 className="text-[22px] font-medium tracking-tight text-zinc-200">What are we working on?</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Work with your agent. Give it a computer when it needs one, follow along, or take over at any time.</p>
        <div className="mt-7 space-y-2">{["Build and test a web app", "Research a market together", "Check my app across operating systems"].map(prompt => <button key={prompt} onClick={() => setDraft(prompt)} className="flex w-full items-center justify-between gap-2 rounded-xl bg-white/[0.035] px-4 py-3 text-left text-xs text-zinc-400 hover:bg-white/[0.07]">{prompt}<CaretRight className="size-3 shrink-0 text-zinc-600" /></button>)}</div>
        {!projects.length && <div className="mt-6"><p className="mb-3 text-xs text-zinc-500">Create a project to give this conversation a home.</p><CreateContainer kind="project" /></div>}
        {!agents.length && <Button variant="secondary" className="mt-4" onClick={() => navigate("/agents")}>Set up an agent</Button>}
      </div> : <div className="space-y-6 pt-5" role="log" aria-label="Agent conversation">
        {conversation.messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-8 rounded-2xl bg-white/[0.065] px-4 py-3 text-sm leading-6 text-zinc-300" : "whitespace-pre-wrap text-sm leading-6 text-zinc-400"}>{message.role === "assistant" && <p className="mb-2 text-xs font-medium text-zinc-200">{agents.find(a => a.id === agentId)?.name}</p>}{message.content}</div>)}
        {conversation.artifacts.map(file => <a key={file.name} download={file.name} href={"data:text/plain;charset=utf-8," + encodeURIComponent(file.content)} className="block rounded-xl bg-white/5 p-4 text-xs text-zinc-300">↓ {file.name}<span className="mt-1 block text-zinc-500">Download demo result</span></a>)}
      </div>}
      <div ref={bottom} />
    </div>
    <div className="shrink-0 space-y-3 px-4 pb-4">
      {computers.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{computers.map(m => <button key={m.id} onClick={() => navigate("/projects/" + m.projectId + "/machines/" + m.id)} className="flex shrink-0 items-center gap-2 rounded-lg bg-white/[0.045] px-3 py-2 text-xs text-zinc-400 hover:bg-white/[0.08]"><OsLogo os={m.os} className="size-3.5" />{m.name}<span className={"size-1.5 rounded-full " + (m.status === "running" ? "bg-emerald-400" : "bg-zinc-600")} /></button>)}</div>}
      {conversation && !ended && <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="mr-auto text-[11px] text-zinc-500">{!computers.length ? "No computers attached" : conversation.status === "review" ? "Ready for your review" : conversation.status === "paused" ? "Agent paused" : "Demo run ready"}</span>
        {conversation.status === "running" && <><Button variant="ghost" size="sm" onClick={() => act(() => orbitActions.taskAction(conversation.id, "pause"))}>Pause</Button><Button variant="secondary" size="sm" onClick={() => act(() => orbitActions.taskAction(conversation.id, "advance"))}>Preview next step</Button></>}
        {conversation.status === "paused" && computers.length > 0 && <Button variant="secondary" size="sm" onClick={() => act(() => orbitActions.taskAction(conversation.id, "resume"))}>Continue</Button>}
        {conversation.status === "review" && <Button size="sm" onClick={() => act(() => orbitActions.taskAction(conversation.id, "approve"))}>Approve result</Button>}
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>More</DropdownMenuTrigger><DropdownMenuContent side="top"><DropdownMenuItem onClick={() => act(() => orbitActions.taskAction(conversation.id, "cancel"))}>End run · retain computers</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>}
      <ErrorNotice message={error} />
      <form className="rounded-2xl bg-[#262626] p-3" onSubmit={e => { e.preventDefault(); send(); }}>
        <textarea aria-label="Message your agent" className="h-20 w-full resize-none bg-transparent p-1 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-500" placeholder="Message your agent…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }} />
        <div className="flex items-center gap-2">
          {!conversation && <SelectControl label="Agent" value={agentId} onValueChange={setChosenAgent} options={agents.map(a => ({ value: a.id, label: a.name }))} className="max-w-[160px] !bg-transparent !px-1" />}
          <span className="text-[10px] text-zinc-500">{conversation ? "Conversation saved locally" : "Local preview"}</span>
          <Button type="submit" size="icon-sm" className="ml-auto rounded-full" aria-label="Send message" disabled={!draft.trim() || !projectId || !agentId}><ArrowUp className="size-4" /></Button>
        </div>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {!conversation && projects.length > 0 && <SelectControl label="Conversation project" value={projectId} onValueChange={setChosenProject} options={projects.map(p => ({ value: p.id, label: p.name }))} className="max-w-[140px] !bg-transparent" />}
        {conversation && <span className="mr-auto max-w-[120px] truncate px-1 text-xs text-zinc-500">{projects.find(p => p.id === projectId)?.name}</span>}
        {projectId && agentId && !ended && <>
          <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}><Monitor className="mr-1 size-3.5" />Attach</DropdownMenuTrigger><DropdownMenuContent side="top" className="w-64">{available.length ? available.map(m => <DropdownMenuItem key={m.id} onClick={() => attach([m.id])}><OsLogo os={m.os} className="size-4" /><span className="flex-1 truncate">{m.name}</span><span className="text-[10px] text-zinc-500">{m.status}</span></DropdownMenuItem>) : <DropdownMenuItem disabled>No available computers</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
          <CreateMachineDialog projectId={projectId} onCreated={attach} />
        </>}
        {ended && <Button variant="ghost" size="sm" onClick={() => { orbitActions.newConversation(); navigate("/new"); }}>New conversation</Button>}
      </div>
    </div>
  </aside>;
}
