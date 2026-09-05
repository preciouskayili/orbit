import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { SelectControl } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CreateMachineDialog } from "@/components/create-machine-dialog";
import { OsLogo } from "@/components/os-logo";
import { StatusBadge } from "@/components/status-badge";
import { ComputerEmptyState } from "@/components/computer-empty-state";
import { CaretRight } from "@/components/ui/icons";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { workspaceComputers, projectComputers } from "@/lib/orbit-selectors";

type Filter = "all" | "available" | "used" | "stopped";
export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  return <ComputerFleet key={projectId} projectId={projectId} />;
}
export function ComputerFleet({ projectId }: { projectId?: string }) {
  const state = useOrbit();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const project = state.projects.find(
    (p) => p.id === projectId && p.workspaceId === state.workspaceId,
  );
  const machines = projectId
    ? projectComputers(state, projectId)
    : workspaceComputers(state);
  const assignment = (id: string) =>
    state.tasks.find(
      (t) =>
        !["completed", "cancelled"].includes(t.status) &&
        t.machineIds.includes(id),
    );
  const visible = machines.filter((m) =>
    filter === "available"
      ? !assignment(m.id) &&
        state.control[m.id] !== "human" &&
        m.status === "running"
      : filter === "used"
        ? Boolean(assignment(m.id))
        : filter === "stopped"
          ? m.status === "stopped"
          : true,
  );
  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="window-drag flex h-[54px] shrink-0 items-center px-5 text-sm text-zinc-500">
        {project?.name ?? "Computers"}
      </header>
      <div className="min-h-0 flex-1 overflow-auto px-5 pb-6 pt-5">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-medium tracking-tight text-zinc-200">
              {project ? "Working in this project" : "Your cloud computers"}
            </h1>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {project
                ? "Only computers connected to active conversations."
                : machines.length +
                  " computers · " +
                  machines.filter((m) => m.status === "running").length +
                  " online"}
            </p>
          </div>
          {project && machines.length > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                orbitActions.newConversation();
                navigate("/new?project=" + project.id);
              }}
            >
              New conversation
            </Button>
          ) : !project && machines.length > 0 ? (
            <CreateMachineDialog />
          ) : null}
        </div>
        {machines.length > 0 && (
          <div className="mb-3 flex justify-end">
            <SelectControl<Filter>
              label="Filter computers"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: "all", label: "All computers" },
                { value: "available", label: "Available" },
                { value: "used", label: "In use" },
                { value: "stopped", label: "Stopped" },
              ]}
              className="!bg-transparent"
            />
          </div>
        )}
        <div className="space-y-1.5">
          {visible.map((machine) => {
            const task = assignment(machine.id);
            const projectName = state.projects.find(
              (p) => p.id === task?.projectId,
            )?.name;
            return (
              <Link
                key={machine.id}
                to={"/computers/" + machine.id}
                aria-label={"Open " + machine.name}
                className="group flex items-center gap-3 rounded-xl bg-white/[0.025] px-4 py-4 transition-colors hover:bg-white/[0.055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
                title={
                  machine.osLabel +
                  " · " +
                  machine.cpu +
                  " vCPU · " +
                  machine.ramGb +
                  " GB memory · " +
                  machine.storageGb +
                  " GB disk"
                }
              >
                <OsLogo os={machine.os} className="size-6" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm text-zinc-200">
                    {machine.name}
                  </h2>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {task
                      ? projectName + " · " + task.title
                      : state.control[machine.id] === "human"
                        ? "You’re interacting"
                        : machine.osLabel}
                  </p>
                </div>
                <StatusBadge status={machine.status} />
                <CaretRight className="size-3 text-zinc-600 group-hover:text-zinc-300" />
              </Link>
            );
          })}
        </div>
        {!visible.length && (
          <ComputerEmptyState
            title={
              machines.length
                ? "Nothing in this view"
                : project
                  ? "Ready when you are"
                  : "A computer of their own"
            }
            description={
              machines.length
                ? "Try a different filter to find a computer in your fleet."
                : project
                  ? "Start a conversation and mention a computer. Only the ones you use will appear here."
                  : "Give your agent a place to build, browse, and test. Your personal machine stays untouched."
            }
          >
            {machines.length ? (
              <Button variant="secondary" onClick={() => setFilter("all")}>
                Show all computers
              </Button>
            ) : project ? (
              <Button
                variant="secondary"
                onClick={() => {
                  orbitActions.newConversation();
                  navigate("/new?project=" + project.id);
                }}
              >
                Start a conversation
              </Button>
            ) : (
              <CreateMachineDialog />
            )}
          </ComputerEmptyState>
        )}
      </div>
    </div>
  );
}
