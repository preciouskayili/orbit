import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { OsLogo } from "@/components/os-logo";
import { CreateMachineDialog } from "@/components/create-machine-dialog";
import { SelectControl } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CreateContainer, Empty, ErrorNotice, Field } from "@/components/flow-ui";

export function ScheduleComposer() {
  const state = useOrbit();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projects = state.projects.filter(p => p.workspaceId === state.workspaceId);
  const agents = state.agents.filter(a => a.workspaceId === state.workspaceId);
  const [projectId, setProjectId] = useState(projects.find(p => p.id === params.get("project"))?.id ?? projects[0]?.id ?? "");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [machineIds, setMachineIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [cadence, setCadence] = useState<"Daily" | "Weekdays" | "Weekly">("Daily");
  const [time, setTime] = useState("09:00");
  const [error, setError] = useState("");
  const machines = state.machines.filter(m => m.projectId === projectId);
  const busy = (mid: string) => state.tasks.some(t => ["running", "paused", "review"].includes(t.status) && t.machineIds.includes(mid));
  function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      orbitActions.saveSchedule({ projectId, agentId, machineIds, prompt, cadence, time }); navigate("/scheduled");
    } catch (e) { setError((e as Error).message); }
  }
  if (!projects.length) return <Empty title="First, give your work a home"><p className="mb-4">Create a project, then add computers and schedule recurring work.</p><CreateContainer kind="project" /></Empty>;
  return <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
    <Field label="What should your agent do?"><textarea className="flow-input min-h-36 !p-4 !text-base" placeholder="Build and test a website. Research a market. Run an experiment across three computers…" required value={prompt} onChange={e => setPrompt(e.target.value)} /></Field>
    <div className="flex flex-wrap gap-2">{["Build and test a web application", "Research competitors and prepare a report", "Run browser QA across operating systems"].map(p => <button key={p} type="button" onClick={() => setPrompt(p)} className="rounded-lg bg-white/[0.035] px-3 py-2 text-xs text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-300">{p}</button>)}</div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Project"><SelectControl label="Project" className="w-full" value={projectId} onValueChange={value => { setProjectId(value); setMachineIds([]); }} options={projects.map(p => ({ value: p.id, label: p.name }))} /></Field>
      <Field label="Agent"><SelectControl label="Agent" className="w-full" value={agentId} onValueChange={setAgentId} options={agents.map(a => ({ value: a.id, label: a.name }))} /></Field>
    </div>
    <section><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm text-zinc-200">Assign computers</h2><p className="mt-1 text-xs text-zinc-500">{machineIds.length} selected · stopped computers start with the run</p></div><CreateMachineDialog projectId={projectId} /></div>
      <div className="space-y-2">{machines.map(m => <label key={m.id} className={"flex items-center gap-3 rounded-xl p-4 " + (machineIds.includes(m.id) ? "bg-white/[0.08]" : "bg-white/[0.035]")}><Checkbox checked={machineIds.includes(m.id)} onCheckedChange={checked => setMachineIds(ids => checked ? [...ids, m.id] : ids.filter(id => id !== m.id))} /><OsLogo os={m.os} /><span className="min-w-0 flex-1"><span className="block text-sm text-zinc-300">{m.name}</span><span className="text-xs text-zinc-500">{m.osLabel} · {m.cpu} vCPU · {m.ramGb} GB</span></span><span className="text-xs text-zinc-500">{busy(m.id) ? "Assigned" : m.status}</span></label>)}{!machines.length && <Empty title="Add your first computer">Choose an OS and resources with New computer above.</Empty>}</div>
    </section>
    {<div className="grid grid-cols-2 gap-4"><Field label="Repeat"><SelectControl<typeof cadence> label="Repeat" className="w-full" value={cadence} onValueChange={setCadence} options={([{value: "Daily", label: "Daily"}, {value: "Weekdays", label: "Weekdays"}, {value: "Weekly", label: "Weekly"}])} /></Field><Field label="Time · your local timezone"><input className="flow-input" type="time" required value={time} onChange={e => setTime(e.target.value)} /></Field></div>}
    <ErrorNotice message={error} />
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-md text-xs leading-5 text-zinc-600">Schedules are saved locally. Use Run now to preview; automatic execution arrives with the backend.</p><Button type="submit" disabled={!prompt.trim() || !machineIds.length || !agentId}>Save schedule</Button></div>
  </form>;
}
