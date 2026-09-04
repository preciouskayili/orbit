import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { Page, Empty, ErrorNotice } from "@/components/flow-ui";
import { TaskComposer } from "@/components/task-composer";
import { Button } from "@/components/ui/button";
import { OsLogo } from "@/components/os-logo";
import { Check, FileText } from "@/components/ui/icons";

export function NewTaskPage() {
  const state = useOrbit();
  return <Page title="What are we working on?" description="Give your agent a task and a fleet. Orbit keeps the computers, context, and results together."><TaskComposer key={state.workspaceId} /></Page>;
}
export function TasksPage() {
  const state = useOrbit();
  const [filter, setFilter] = useState("All");
  const projects = state.projects.filter(p => p.workspaceId === state.workspaceId);
  const tasks = state.tasks.filter(t => projects.some(p => p.id === t.projectId));
  return <Page title="Tasks" description="Every run, from the first instruction to the final result." actions={<Link to="/new" className="rounded-lg bg-zinc-200 px-3 py-2 text-xs text-zinc-900">New task</Link>}>
    <div className="mb-5 flex flex-wrap gap-1">{["All", "running", "paused", "review", "completed", "cancelled"].map(f => <button key={f} onClick={() => setFilter(f)} className={"rounded-lg px-3 py-2 text-xs capitalize " + (f === filter ? "bg-white/10 text-zinc-200" : "text-zinc-500")}>{f}</button>)}</div>
    <div className="space-y-2">{tasks.filter(t => filter === "All" || t.status === filter).map(task => <Link key={task.id} to={"/tasks/" + task.id} className="flex items-center gap-4 rounded-xl bg-white/[0.035] p-4 hover:bg-white/[0.065]"><span className="min-w-0 flex-1"><span className="block truncate text-sm text-zinc-200">{task.title}</span><span className="mt-1 block text-xs text-zinc-500">{projects.find(p => p.id === task.projectId)?.name} · {task.machineIds.length} computers · {state.agents.find(a => a.id === task.agentId)?.name}</span></span><span className={"rounded-md px-2 py-1 text-xs capitalize " + (task.status === "review" ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-zinc-400")}>{task.status}</span></Link>)}</div>
    {!tasks.some(t => filter === "All" || t.status === filter) && <Empty title="No tasks here yet"><Link to="/new" className="text-zinc-200 underline">Start a task</Link> and follow its progress here.</Empty>}
  </Page>;
}
export function TaskDetailPage() {
  const { taskId } = useParams();
  const state = useOrbit();
  const [error, setError] = useState("");
  const task = state.tasks.find(t => t.id === taskId && state.projects.some(p => p.id === t.projectId && p.workspaceId === state.workspaceId));
  if (!task) return <Page title="Task not found"><Link to="/tasks">Back to tasks</Link></Page>;
  const act = (action: Parameters<typeof orbitActions.taskAction>[1]) => { try { orbitActions.taskAction(task.id, action); setError(""); } catch (e) { setError((e as Error).message); } };
  return <Page title="Run overview" description={task.title} actions={<span className="rounded-lg bg-white/5 px-3 py-2 text-xs capitalize text-zinc-400">{task.status}</span>}>
    <ErrorNotice message={error} />
    <div className="mb-6 flex flex-wrap gap-2">
      {task.status === "running" && <><Button onClick={() => act("advance")}>Preview next step</Button><Button variant="secondary" onClick={() => act("pause")}>Pause</Button></>}
      {task.status === "paused" && <Button onClick={() => act("resume")}>Resume</Button>}
      {task.status === "review" && <Button onClick={() => act("approve")}>Approve results</Button>}
      {!["completed", "cancelled"].includes(task.status) && <Button variant="ghost" onClick={() => act("cancel")}>Cancel task</Button>}
      <Link to={"/new?project=" + task.projectId} className="rounded-lg px-3 py-2 text-xs text-zinc-400 hover:bg-white/5">New task in project</Link>
    </div>
    <section className="rounded-2xl bg-white/[0.035] p-5"><h2 className="mb-4 text-sm text-zinc-200">Run activity</h2><ol className="space-y-4">{task.events.map((event, index) => <li key={index} className="flex items-start gap-3"><Check className="mt-0.5 size-3.5 text-emerald-400" /><div><p className="text-sm text-zinc-300">{event.title}</p><time className="text-[11px] text-zinc-600">{new Date(event.timestamp).toLocaleTimeString()}</time></div></li>)}</ol></section>
    <section className="mt-6"><h2 className="mb-3 text-sm text-zinc-400">Assigned computers</h2><div className="space-y-2">{task.machineIds.map(mid => { const m = state.machines.find(m => m.id === mid); return m && <Link key={mid} to={"/projects/" + m.projectId + "/machines/" + mid} className="flex items-center gap-3 rounded-xl bg-white/[0.035] p-4 hover:bg-white/[0.06]"><OsLogo os={m.os} /><span className="text-sm text-zinc-300">{m.name}</span><span className="ml-auto text-xs text-zinc-500">{state.control[mid] === "human" ? "Human control" : m.status}</span></Link>; })}</div></section>
    <section className="mt-6"><h2 className="mb-3 text-sm text-zinc-400">Outputs</h2>{task.artifacts.length ? task.artifacts.map(file => <div key={file.name} className="rounded-xl bg-white/[0.035] p-4"><div className="flex items-center gap-2 text-sm text-zinc-300"><FileText className="size-4" />{file.name}<a className="ml-auto text-xs text-zinc-400 underline" href={"data:text/markdown;charset=utf-8," + encodeURIComponent(file.content)} download={file.name}>Download</a></div><pre className="mt-4 whitespace-pre-wrap text-xs leading-6 text-zinc-500">{file.content}</pre></div>) : <p className="rounded-xl bg-white/[0.025] p-4 text-xs text-zinc-600">Outputs appear when the run is ready for review.</p>}</section>
  </Page>;
}
