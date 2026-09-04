import {
  ArrowUpRight,
  Clock as Clock3,
  Cube as Boxes,
  Plus,
} from "@/components/ui/icons";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/queries";
import { ErrorState, LoadingState } from "@/components/query-state";
import { TopBar } from "@/components/top-bar";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();

  return (
    <div className="flex h-full flex-col">
      <TopBar
        eyebrow="Workspace"
        title="Projects"
        description="Persistent environments, machines, and agent context"
        actions={<Button size="sm" disabled><Plus className="size-3" /> New project</Button>}
      />
      {isLoading ? <LoadingState label="Loading projects" /> : error ? <ErrorState error={error} /> : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-[14px] font-medium text-zinc-200">Your projects</p>
              <p className="mt-1 text-[12px] text-zinc-600">Each project keeps its computers, files, and agent history together.</p>
            </div>
            <p className="text-[11px] text-zinc-600">{projects?.length ?? 0} total</p>
          </div>

          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {projects?.map((project, index) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group min-h-[180px] rounded-2xl border border-white/[0.075] bg-[#181818] p-5 text-left transition-colors hover:border-white/[0.14] hover:bg-[#1b1b1b]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-zinc-500 group-hover:text-[#db7657]">
                    <Boxes className="size-[18px]" />
                  </span>
                  <ArrowUpRight className="size-3.5 text-zinc-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </div>
                <h2 className="mt-5 text-[15px] font-medium text-zinc-200">{project.name}</h2>
                <p className="mt-1.5 line-clamp-1 text-[12px] text-zinc-600">{project.description}</p>
                <div className="mt-5 flex items-center gap-3 text-[10px] text-zinc-600">
                  <span>{project.machineCount} machine{project.machineCount === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1"><Clock3 className="size-2.5" /> {index === 0 ? "12 min ago" : index === 1 ? "9 hr ago" : "3 days ago"}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[11px] leading-5 text-zinc-600">Projects are the durable boundary for computers, agent context, files, and activity.</p>
          </div>
        </div>
      )}
    </div>
  );
}
