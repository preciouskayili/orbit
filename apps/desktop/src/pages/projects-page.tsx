import { ArrowUpRight, Boxes, Clock3, Plus } from "lucide-react";
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
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[12px] font-medium text-zinc-300">Your projects</p>
              <p className="mt-1 text-[10px] text-zinc-600">Each project keeps its machines, files, and agent history together.</p>
            </div>
            <p className="text-[9px] text-zinc-700">{projects?.length ?? 0} total</p>
          </div>

          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {projects?.map((project, index) => (
              <button
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="group min-h-[148px] rounded-lg border border-line bg-panel p-4 text-left hover:border-white/[0.12] hover:bg-[#13141a]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-8 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.035] text-zinc-500 group-hover:text-[#ff8c70]">
                    <Boxes className="size-3.5" />
                  </span>
                  <ArrowUpRight className="size-3.5 text-zinc-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </div>
                <h2 className="mt-4 text-[12px] font-semibold text-zinc-200">{project.name}</h2>
                <p className="mt-1 line-clamp-1 text-[10px] text-zinc-600">{project.description}</p>
                <div className="mt-4 flex items-center gap-3 text-[9px] text-zinc-700">
                  <span>{project.machineCount} machine{project.machineCount === 1 ? "" : "s"}</span>
                  <span className="flex items-center gap-1"><Clock3 className="size-2.5" /> {index === 0 ? "12 min ago" : index === 1 ? "9 hr ago" : "3 days ago"}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[9px] leading-4 text-zinc-700">Projects are the durable boundary for machines, agent context, files, and activity. Authentication and cloud persistence will be added later.</p>
          </div>
        </div>
      )}
    </div>
  );
}
