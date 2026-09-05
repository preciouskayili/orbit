import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Machine } from "@orbit/shared";
import { MagnifyingGlass, Monitor, X } from "@/components/ui/icons";
import { SelectControl } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ComputerCard } from "@/components/computer-card";
import { CreateMachineDialog } from "@/components/create-machine-dialog";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { workspaceComputers, projectComputers } from "@/lib/orbit-selectors";

const filters = ["All", "Running", "Stopped", "Needs attention"] as const;
type Filter = (typeof filters)[number];
type Sort = "status" | "name" | "recent";
const statusOrder: Record<Machine["status"], number> = {
  error: 0,
  running: 1,
  starting: 2,
  stopping: 3,
  stopped: 4,
};

function matchesFilter(machine: Machine, filter: Filter) {
  if (filter === "Running") return machine.status === "running";
  if (filter === "Stopped") return machine.status === "stopped";
  if (filter === "Needs attention") return machine.status === "error";
  return true;
}

export function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  return <ComputerFleet key={projectId} projectId={projectId} />;
}

export function ComputerFleet({ projectId }: { projectId?: string }) {
  const state = useOrbit();
  const navigate = useNavigate();
  const project = state.projects.find(
    (p) => p.id === projectId && p.workspaceId === state.workspaceId,
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<Sort>("status");

  const machines = projectId
    ? projectComputers(state, projectId)
    : workspaceComputers(state);
  const running = machines.filter((machine) => machine.status === "running");
  const cpu = machines.reduce((total, machine) => total + machine.cpu, 0);
  const memory = machines.reduce((total, machine) => total + machine.ramGb, 0);
  const storage = machines.reduce(
    (total, machine) => total + machine.storageGb,
    0,
  );
  const activity = state.activity
    .filter((a) => machines.some((m) => m.id === a.machineId))
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const query = search.trim().toLowerCase();
  const visible = machines
    .filter((machine) => matchesFilter(machine, filter))
    .filter((machine) =>
      [machine.name, machine.osLabel, machine.id]
        .join(" ")
        .toLowerCase()
        .includes(query),
    )
    .sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") return b.lastSeenAt.localeCompare(a.lastSeenAt);
      return (
        statusOrder[a.status] - statusOrder[b.status] ||
        a.name.localeCompare(b.name)
      );
    });

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#171818]">
      <header className="window-drag flex h-[54px] shrink-0 items-center gap-2 bg-[#1a1a1a] px-5">
        <Monitor className="size-4 shrink-0 text-zinc-500" />
        <span className="truncate text-sm text-zinc-400">
          {project?.name ??
            state.workspaces.find((w) => w.id === state.workspaceId)?.name}
        </span>
        <span className="text-zinc-600">/</span>
        <span className="text-sm text-zinc-200">Computers</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-medium tracking-tight text-zinc-100">
                {project ? "Computers in use" : "Your computers"}
              </h1>
              <p className="mt-1.5 text-sm leading-5 text-zinc-500">
                {project
                  ? "Computers currently attached to this project’s conversations."
                  : "One shared fleet. Available wherever your work takes you."}
              </p>
            </div>
            {project ? (
              <Button
                size="sm"
                onClick={() => {
                  orbitActions.newConversation();
                  navigate("/new?project=" + project.id);
                }}
              >
                Work with agent
              </Button>
            ) : (
              <CreateMachineDialog />
            )}
          </div>

          <div className="my-6 rounded-2xl bg-[#202121] p-4">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-2 text-sm text-zinc-200">
                <span
                  className={
                    running.length
                      ? "size-2 rounded-full bg-emerald-400"
                      : "size-2 rounded-full bg-zinc-500"
                  }
                />
                {running.length} of {machines.length} online
              </span>
              <span className="text-xs text-zinc-500">
                {
                  machines.filter((machine) => machine.status === "stopped")
                    .length
                }{" "}
                stopped
              </span>
              {machines.some((machine) => machine.status === "error") && (
                <button
                  onClick={() => setFilter("Needs attention")}
                  className="rounded-md bg-rose-400/10 px-2 py-1 text-xs text-rose-300"
                >
                  Review errors
                </button>
              )}
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              Allocated{" "}
              {project
                ? "to this project’s active work"
                : "across your workspace"}{" "}
              <span className="mx-1 text-zinc-600">·</span>
              <span className="text-zinc-400">
                {cpu} vCPU · {memory} GB memory · {storage} GB disk
              </span>
            </p>
          </div>

          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="flex h-9 min-w-[160px] flex-1 items-center gap-2 rounded-lg bg-white/[0.04] px-3 focus-within:ring-2 focus-within:ring-white/20">
                <MagnifyingGlass className="size-4 shrink-0 text-zinc-500" />
                <input
                  aria-label="Search computers"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or operating system…"
                  className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-600"
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="rounded p-1 text-zinc-400 hover:bg-white/10"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
              <SelectControl<Sort>
                label="Sort computers"
                value={sort}
                onValueChange={setSort}
                options={[
                  { value: "status", label: "Status first" },
                  { value: "name", label: "Name A–Z" },
                  { value: "recent", label: "Last seen" },
                ]}
              />
            </div>
            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label="Filter computers"
            >
              {filters.map((option) => (
                <button
                  key={option}
                  aria-pressed={filter === option}
                  onClick={() => setFilter(option)}
                  className={`flex h-8 items-center gap-2 rounded-lg px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 ${filter === option ? "bg-white/[0.08] text-zinc-200" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"}`}
                >
                  {option}
                  <span className="text-[11px] text-zinc-500">
                    {
                      machines.filter((machine) =>
                        matchesFilter(machine, option),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="sr-only" role="status">
            {visible.length} computers shown
          </p>
          {visible.length ? (
            <div className="fleet-grid">
              {visible.map((machine) => (
                <ComputerCard
                  key={machine.id}
                  machine={machine}
                  activity={activity.find(
                    (event) => event.machineId === machine.id,
                  )}
                  activityState="ready"
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.025] px-5 py-14 text-center">
              <Monitor className="mx-auto size-7 text-zinc-600" />
              <h2 className="mt-4 text-sm font-medium text-zinc-200">
                {machines.length
                  ? "No computers match"
                  : project
                    ? "No computers in use yet"
                    : "Your fleet starts here"}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                {machines.length
                  ? "Try another name, operating system, or status."
                  : project
                    ? "Mention a computer in your conversation, or attach one from the shared fleet."
                    : "Create a computer to give your agents a workspace."}
              </p>
              {machines.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearch("");
                    setFilter("All");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
          <p className="mt-5 text-xs leading-5 text-zinc-600">
            Open a computer to inspect its workspace. Resource values show
            allocated capacity.
          </p>
        </div>
      </div>
    </div>
  );
}
