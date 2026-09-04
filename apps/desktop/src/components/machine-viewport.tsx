import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Circle,
  CircleUserRound,
  Code2,
  FileText,
  Globe2,
  LayoutDashboard,
  Lock,
  MousePointer2,
  PackageCheck,
  RefreshCw,
  RotateCw,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import type { Machine } from "@orbit/shared";

const checks = [
  { label: "Unit and integration tests", detail: "51 checks", state: "Passed" },
  { label: "Browser regression", detail: "Chrome · Windows", state: "Running" },
  { label: "Desktop artifact", detail: "macOS arm64", state: "Ready" },
];

export function MachineViewport({ machine }: { machine: Machine }) {
  const offline = machine.status !== "running";

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-[#111111] p-3">
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.09] bg-[#202124] shadow-[0_24px_70px_rgba(0,0,0,.38)]">
        <ComputerTitleBar machine={machine} />
        <BrowserChrome machine={machine} />
        <ReleaseDashboard />

        {offline && (
          <div className="absolute inset-3 flex items-center justify-center rounded-xl bg-[#111]/80 backdrop-blur-md">
            <div className="w-[280px] rounded-2xl border border-white/[0.09] bg-[#202020] p-6 text-center text-zinc-200 shadow-2xl">
              <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-white/[0.055] text-zinc-500"><Terminal className="size-5" /></span>
              <p className="mt-4 text-[14px] font-medium">{machine.name} is stopped</p>
              <p className="mt-1.5 text-[12px] leading-5 text-zinc-500">Start this computer to reconnect the agent and restore its session.</p>
              <button className="mt-4 inline-flex h-8 items-center rounded-lg bg-zinc-100 px-3 text-[12px] font-medium text-zinc-900 hover:bg-white">Start computer</button>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/[0.09] bg-[#1b1b1b]/95 p-1 shadow-[0_10px_36px_rgba(0,0,0,.42)] backdrop-blur-xl">
        <DockItem label="Browser" active><Globe2 className="size-4" /></DockItem>
        <DockItem label="Terminal"><Terminal className="size-4" /></DockItem>
        <DockItem label="Code"><Code2 className="size-4" /></DockItem>
        <span className="mx-1 h-5 w-px bg-white/[0.08]" />
        <DockItem label="Restart"><RotateCw className="size-4" /></DockItem>
      </div>
    </section>
  );
}

function ComputerTitleBar({ machine }: { machine: Machine }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-black/20 bg-[#25262a] px-3">
      <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#ff605c]" /><span className="size-2.5 rounded-full bg-[#ffbd44]" /><span className="size-2.5 rounded-full bg-[#28c840]" /></div>
      <span className="mx-auto text-[10px] text-zinc-500">{machine.name} · Orbit secure session</span>
      <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-medium text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" /> Agent controlled</span>
    </div>
  );
}

function BrowserChrome({ machine }: { machine: Machine }) {
  return (
    <div className="shrink-0 bg-[#2d2e33]">
      <div className="flex h-9 items-end px-3">
        <div className="flex h-8 w-[220px] items-center gap-2 rounded-t-lg bg-[#3a3b41] px-3 text-[11px] text-zinc-300"><PackageCheck className="size-3.5 text-[#df7657]" /><span className="truncate">Trace · Release control</span></div>
        <button className="mb-1 ml-1 flex size-6 items-center justify-center rounded-md text-zinc-500 hover:bg-white/[0.06]">+</button>
      </div>
      <div className="flex h-10 items-center gap-3 px-3 pb-2">
        <ArrowLeft className="size-4 text-zinc-500" /><ArrowRight className="size-4 text-zinc-600" /><RefreshCw className="size-3.5 text-zinc-500" />
        <div className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-lg bg-[#202125] px-3 text-[10px] text-zinc-400"><Lock className="size-3 text-emerald-400/80" /> release.trace.app/checks <span className="ml-auto text-zinc-600">{machine.id}</span></div>
        <CircleUserRound className="size-4 text-zinc-500" />
      </div>
    </div>
  );
}

function ReleaseDashboard() {
  return (
    <div className="flex min-h-0 flex-1 bg-[#f5f5f3] text-[#252525]">
      <aside className="hidden w-[168px] shrink-0 border-r border-[#e2e2df] bg-[#efefec] p-4 xl:block">
        <div className="flex items-center gap-2 text-[14px] font-semibold tracking-[-0.02em]"><span className="flex size-7 items-center justify-center rounded-lg bg-[#242424] text-[11px] text-white">T</span> Trace</div>
        <nav className="mt-7 space-y-1 text-[11px] text-[#777773]">
          <p className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"><LayoutDashboard className="size-4" /> Overview</p>
          <p className="flex items-center gap-2.5 rounded-lg bg-white px-2.5 py-2 font-medium text-[#292929] shadow-sm"><ShieldCheck className="size-4" /> Release</p>
          <p className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"><FileText className="size-4" /> Artifacts</p>
          <p className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"><Settings className="size-4" /> Settings</p>
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto px-[clamp(18px,3vw,44px)] py-7">
        <div className="mx-auto max-w-[780px]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#a09f99]">Release 0.8.4</p><h1 className="mt-1 text-[clamp(20px,2vw,28px)] font-semibold tracking-[-0.035em]">Ready for review</h1><p className="mt-1.5 text-[12px] text-[#777773]">Three computers are validating this release in parallel.</p></div>
            <button className="flex h-8 items-center gap-1.5 rounded-lg border border-[#deded9] bg-white px-3 text-[11px] font-medium shadow-sm">Latest run <ChevronDown className="size-3.5 text-[#888]" /></button>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-3">
            <Metric label="Checks" value="8 / 9" detail="One needs review" />
            <Metric label="Computers" value="3" detail="1 active now" />
            <Metric label="Duration" value="8m 42s" detail="34% faster" good />
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-[#dfdfdc] bg-white shadow-[0_8px_30px_rgba(30,30,30,.035)]">
            <div className="flex items-center border-b border-[#ecece8] px-4 py-3"><span className="text-[12px] font-semibold">Release checks</span><span className="ml-2 rounded-full bg-[#f0f0ed] px-2 py-0.5 text-[9px] text-[#777]">3</span><div className="ml-auto flex h-7 items-center gap-2 rounded-lg border border-[#e4e4e0] px-2.5 text-[10px] text-[#999]"><Search className="size-3" /> Search</div></div>
            {checks.map((check, index) => (
              <div key={check.label} className="flex items-center gap-3 border-b border-[#eeeeeb] px-4 py-3 last:border-b-0">
                <span className={`flex size-7 items-center justify-center rounded-full ${check.state === "Running" ? "bg-[#fff0e9] text-[#d66747]" : "bg-[#eaf6ef] text-[#2f9468]"}`}>{check.state === "Running" ? <Circle className="size-2.5 fill-current" /> : <Check className="size-3.5" />}</span>
                <span className="min-w-0 flex-1"><span className="block text-[12px] font-medium">{check.label}</span><span className="mt-0.5 block text-[10px] text-[#969691]">{check.detail}</span></span>
                <span className={`rounded-full px-2 py-1 text-[9px] font-medium ${check.state === "Running" ? "bg-[#fff0e9] text-[#c85c3e]" : "bg-[#edf6f0] text-[#32835f]"}`}>{check.state}</span>
              </div>
            ))}
          </div>

          <div className="relative mt-4 flex items-center gap-3 rounded-xl border border-[#e0d2cc] bg-[#fff9f6] p-4">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#e16e4d]/10 text-[#d56647]"><PackageCheck className="size-[18px]" /></span>
            <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold">Browser review is ready</span><span className="mt-1 block truncate text-[10px] text-[#898681]">The agent left the final approval open for you.</span></span>
            <button className="h-8 rounded-lg bg-[#252525] px-3 text-[10px] font-medium text-white shadow-sm">Review action</button>
            <MousePointer2 className="absolute bottom-1 right-[58px] size-5 -rotate-12 fill-white text-[#222] drop-shadow" />
          </div>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value, detail, good = false }: { label: string; value: string; detail: string; good?: boolean }) {
  return <div className="rounded-xl border border-[#e0e0dd] bg-white p-3.5"><p className="text-[9px] font-medium uppercase tracking-[0.1em] text-[#aaa9a4]">{label}</p><p className="mt-1.5 text-[18px] font-semibold tracking-[-0.03em]">{value}</p><p className={`mt-1 text-[9px] ${good ? "text-[#2f9368]" : "text-[#979691]"}`}>{detail}</p></div>;
}

function DockItem({ label, active = false, children }: { label: string; active?: boolean; children: React.ReactNode }) {
  return <button className={`relative flex size-8 items-center justify-center rounded-lg transition-colors ${active ? "bg-white/[0.1] text-zinc-100" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"}`} title={label} aria-label={label}>{children}{active && <span className="absolute -bottom-0.5 size-1 rounded-full bg-[#db7657]" />}</button>;
}
