import { Check, Circle, Monitor, Terminal } from "lucide-react";
import type { Machine } from "@orbit/shared";
import { useNavigate, useParams } from "react-router-dom";
import { WorkspaceHeader } from "@/components/workspace-header";
import { ErrorState, LoadingState } from "@/components/query-state";
import { useMachines, useProject } from "@/hooks/queries";

const workspaceDocs = [
  {
    eyebrow: "Runbook · Fleet release",
    title: "Trace release plan",
    meta: "Docs · 742 words · 12 min ago",
    body: "Validate the application on Linux and Windows, produce the signed macOS build, then keep every computer attached for human review.",
  },
  {
    eyebrow: "Policy · Agent access",
    title: "Credential boundaries",
    meta: "Docs · 486 words · 3 hr ago",
    body: "Agents can use project-scoped credentials inside assigned computers. Secrets never appear in conversation, logs, or exported artifacts.",
  },
  {
    eyebrow: "Session · Dispatch #4821",
    title: "Computer handoff report",
    meta: "Docs · 618 words · 5 hr ago",
    body: "Ubuntu completed the suite. Windows left the approval screen open. Mac Build produced an artifact and is waiting for signing access.",
  },
];

export function ProjectOverviewPage() {
  const navigate = useNavigate();
  const { projectId = "" } = useParams();
  const projectQuery = useProject(projectId);
  const machinesQuery = useMachines(projectId);

  if (projectQuery.isLoading || machinesQuery.isLoading) return <LoadingState label="Opening fleet" />;
  const error = projectQuery.error || machinesQuery.error;
  if (error) return <ErrorState error={error} />;

  const machines = machinesQuery.data ?? [];

  return (
    <div className="relative flex h-full flex-col bg-[#171818]">
      <WorkspaceHeader projectId={projectId} machines={machines} />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-14 pt-4">
        <SectionLabel label="Computers" count={machines.length} />
        <div className="grid grid-cols-3 gap-3">
          {machines.map((machine, index) => (
            <ComputerCard key={machine.id} machine={machine} index={index} onOpen={() => navigate(`/projects/${projectId}/machines/${machine.id}`)} />
          ))}
        </div>

        <div className="mt-6"><SectionLabel label="Workspace docs" count={workspaceDocs.length} /></div>
        <div className="grid grid-cols-3 gap-3">
          {workspaceDocs.map((doc) => (
            <button key={doc.title} className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#161717] text-left transition-colors hover:border-white/[0.13]">
              <div className="h-[142px] bg-[#2b1e19] p-3 text-[7px] leading-[1.55] text-[#b6a29a]">
                <p className="text-[6px] uppercase tracking-[0.08em] text-[#8f756b]">{doc.eyebrow}</p>
                <p className="mt-3">{doc.body}</p>
                <p className="mt-3 text-[#7f6d66]">Everything remains attached to the project so another agent can continue without repeating setup.</p>
              </div>
              <div className="px-3 py-2.5"><p className="text-[10px] font-semibold text-zinc-300">{doc.title}</p><p className="mt-1 text-[8px] text-zinc-600">{doc.meta}</p></div>
            </button>
          ))}
        </div>

        <div className="mt-7"><SectionLabel label="Data" count={1} /></div>
        <div className="w-[47%] min-w-[340px] overflow-hidden rounded-xl border border-white/[0.075] bg-[#151616]">
          <div className="bg-[#102720] px-3 py-2 text-[7px] font-semibold uppercase tracking-[0.08em] text-emerald-300/70">Fleet status</div>
          <div className="grid grid-cols-[1fr_80px_90px] bg-[#163128] px-3 py-1.5 text-[6px] font-semibold uppercase text-emerald-200/60"><span>Computer</span><span>State</span><span>Agent</span></div>
          {machines.map((machine) => <div key={machine.id} className="grid grid-cols-[1fr_80px_90px] border-t border-white/[0.045] px-3 py-1.5 text-[7px] text-zinc-500"><span>{machine.name}</span><span className="flex items-center gap-1"><span className={`size-1.5 rounded-full ${machine.status === "running" ? "bg-emerald-400" : "bg-zinc-600"}`} />{machine.status}</span><span>{machine.status === "running" ? "Attached" : "—"}</span></div>)}
        </div>
      </div>

      <div className="absolute bottom-[15px] left-1/2 flex h-8 -translate-x-1/2 items-center gap-1 rounded-xl border border-white/[0.09] bg-[#171818] px-2 text-[8px] text-zinc-500 shadow-[0_8px_28px_rgba(0,0,0,.38)]">
        <button className="rounded-md bg-white/[0.075] px-2 py-1 font-semibold text-[#df6247]">All</button>
        <button className="rounded-md px-2 py-1">Computers <span className="rounded-full bg-white/[0.08] px-1">{machines.length}</span></button>
        <button className="rounded-md px-2 py-1">Docs <span className="rounded-full bg-white/[0.08] px-1">{workspaceDocs.length}</span></button>
        <button className="rounded-md px-2 py-1">Browser <span className="rounded-full bg-white/[0.08] px-1">11</span></button>
        <button className="rounded-md px-2 py-1">Uploads <span className="rounded-full bg-white/[0.08] px-1">2</span></button>
        <button className="rounded-md px-2 py-1">+8 kinds</button>
      </div>
    </div>
  );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
  return <p className="mb-3 text-[8px] font-semibold uppercase tracking-[0.12em] text-zinc-600">{label} <span className="ml-1 text-zinc-700">{count}</span></p>;
}

function ComputerCard({ machine, index, onOpen }: { machine: Machine; index: number; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="overflow-hidden rounded-xl border border-white/[0.075] bg-[#161717] text-left transition-colors hover:border-white/[0.13]">
      <div className="h-[142px] bg-[#2b1e19] p-3 text-[7px] text-[#b6a29a]">
        <div className="flex items-center gap-1.5 text-[6px] uppercase tracking-[0.08em] text-[#8f756b]">
          {machine.os === "ubuntu" ? <Terminal className="size-2.5" /> : <Monitor className="size-2.5" />} {machine.osLabel} · {machine.cpu} CPU · {machine.ramGb} GB
        </div>
        {index === 0 ? (
          <div className="mt-4 font-mono leading-[1.7]"><p className="text-[#d7b5a8]">$ pnpm test --run</p><p><Check className="mr-1 inline size-2.5 text-emerald-500" />51 tests passed</p><p><Check className="mr-1 inline size-2.5 text-emerald-500" />typecheck passed</p><p className="mt-2 text-[#765e55]">Agent is waiting for the next command.</p></div>
        ) : index === 1 ? (
          <div className="mt-4 space-y-2"><p className="border-b border-[#5b443b] pb-1.5">Browser review checklist</p><p><Check className="mr-1 inline size-2.5 text-emerald-500" /> Sign in flow</p><p><Circle className="mr-1 inline size-2.5 text-[#d86a4c]" /> Approve test refund</p></div>
        ) : (
          <div className="mt-4 font-mono leading-[1.7]"><p>Building universal artifact…</p><p className="mt-2">trace-desktop-arm64.dmg</p><p className="text-[#80685f]">Waiting for signing credentials</p></div>
        )}
      </div>
      <div className="flex items-end px-3 py-2.5"><span><span className="block text-[10px] font-semibold text-zinc-300">{machine.name}</span><span className="mt-1 block text-[8px] text-zinc-600">{machine.osLabel} · {machine.status}</span></span><span className={`ml-auto size-1.5 rounded-full ${machine.status === "running" ? "bg-emerald-400" : "bg-zinc-600"}`} /></div>
    </button>
  );
}
