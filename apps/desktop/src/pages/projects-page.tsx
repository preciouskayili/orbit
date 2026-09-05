import { Link } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { Page, CreateContainer, Empty } from "@/components/flow-ui";
import { Folder, ArrowUpRight } from "@/components/ui/icons";
export function ProjectsPage() {
  const state = useOrbit();
  const projects = state.projects.filter(p => p.workspaceId === state.workspaceId);
  const workspace = state.workspaces.find(w => w.id === state.workspaceId);
  return <Page title="Projects & computers" description={workspace?.name + " · Persistent computers organized around your work."} actions={<CreateContainer kind="project" />}>
    <div className="fleet-grid">{projects.map(project => {
      const machines = state.machines.filter(m => m.projectId === project.id);
      const tasks = state.tasks.filter(t => t.projectId === project.id && t.status === "running");
      return <Link key={project.id} to={"/projects/" + project.id} className="group rounded-2xl bg-white/[0.035] p-5 hover:bg-white/[0.065]"><div className="mb-5 flex items-center justify-between"><Folder className="size-5 text-zinc-500" /><ArrowUpRight className="size-4 text-zinc-600 group-hover:text-zinc-200" /></div><h2 className="text-sm font-medium text-zinc-200">{project.name}</h2><p className="mt-2 min-h-10 text-xs leading-5 text-zinc-500">{project.description || "A new home for your agents."}</p><div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-500"><span>{machines.length} computers</span><span className="text-emerald-300/70">{machines.filter(m => m.status === "running").length} online</span><span>{tasks.length} agents working</span></div></Link>;
    })}</div>
    {!projects.length && <Empty title="Build your first fleet"><p className="mb-4">Create a project, add computers, and let an agent get to work.</p><CreateContainer kind="project" /></Empty>}
  </Page>;
}
