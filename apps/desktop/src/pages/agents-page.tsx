import { useState, type FormEvent } from "react";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions, type OrbitAgent } from "@/lib/orbit-store";
import { Page, Field, ErrorNotice } from "@/components/flow-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Robot } from "@/components/ui/icons";
export const skillCatalog = [
  { id: "terminal", name: "Terminal", description: "Run commands, install dependencies, and test code on assigned computers." },
  { id: "browser", name: "Browser", description: "Navigate sites and work with web applications on a cloud computer." },
  { id: "files", name: "Files", description: "Read, write, and organize persistent workspace files." },
];
export function AgentsPage() {
  const state = useOrbit();
  const [editing, setEditing] = useState<OrbitAgent | null | undefined>();
  return <Page title="Agents" description="Define how your agents work. Work with them in a conversation and attach computers whenever you need." actions={<Button onClick={() => setEditing(null)}>New agent</Button>}>
    <div className="fleet-grid">{state.agents.filter(a => a.workspaceId === state.workspaceId).map(agent => <button key={agent.id} onClick={() => setEditing(agent)} className="rounded-2xl bg-white/[0.035] p-5 text-left hover:bg-white/[0.065]"><Robot className="size-6 text-[#db7657]" /><h2 className="mt-4 text-sm font-medium text-zinc-200">{agent.name}</h2><p className="mt-2 line-clamp-3 text-xs leading-6 text-zinc-500">{agent.instructions}</p><div className="mt-4 flex flex-wrap gap-2">{agent.skills.map(s => <span key={s} className="rounded-md bg-white/5 px-2 py-1 text-[11px] capitalize text-zinc-400">{s}</span>)}</div></button>)}</div>
    <Dialog open={editing !== undefined} onOpenChange={open => { if (!open) setEditing(undefined); }}><DialogContent className="p-6"><DialogTitle>{editing ? "Edit agent" : "New agent"}</DialogTitle><DialogDescription className="mt-2">Instructions and tools travel with the agent.</DialogDescription>{editing !== undefined && <AgentEditor key={editing?.id ?? "new"} agent={editing} onSaved={() => setEditing(undefined)} />}</DialogContent></Dialog>
  </Page>;
}
function AgentEditor({ agent, onSaved }: { agent: OrbitAgent | null; onSaved: () => void }) {
  const [name, setName] = useState(agent?.name ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const [skills, setSkills] = useState(agent?.skills ?? ["terminal", "browser", "files"]);
  const [error, setError] = useState("");
  function submit(e: FormEvent) { e.preventDefault(); try { orbitActions.saveAgent({ name, instructions, skills }, agent?.id); onSaved(); } catch (e) { setError((e as Error).message); } }
  return <form onSubmit={submit} className="mt-5 space-y-4"><Field label="Name"><input className="flow-input" required value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Instructions"><textarea className="flow-input min-h-28" required value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="What should this agent specialize in? When should it ask for help?" /></Field><fieldset><legend className="mb-3 text-xs text-zinc-400">Enabled skills</legend>{skillCatalog.map(skill => <label key={skill.id} className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3 text-sm text-zinc-300"><Checkbox checked={skills.includes(skill.id)} onCheckedChange={checked => setSkills(s => checked ? [...s, skill.id] : s.filter(id => id !== skill.id))} />{skill.name}</label>)}</fieldset><ErrorNotice message={error} /><Button type="submit">Save agent</Button></form>;
}
export function SkillsPage() {
  return <Page title="Skills" description="Reusable capabilities for your agents. Enable them in each agent's settings."><div className="space-y-3">{skillCatalog.map(s => <div key={s.id} className="rounded-xl bg-white/[0.035] p-5"><h2 className="text-sm font-medium text-zinc-200">{s.name}</h2><p className="mt-2 text-sm leading-6 text-zinc-500">{s.description}</p><p className="mt-3 text-xs text-zinc-600">Available in the prototype · execution connects with the backend</p></div>)}</div></Page>;
}
