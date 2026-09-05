import type { Machine } from "@orbit/shared";
import { useOrbit } from "@/hooks/use-orbit";
import { OsLogo } from "./os-logo";
import { FileText, Folder, Globe, Terminal } from "./ui/icons";

export type ComputerApp = "Desktop" | "Terminal" | "Files" | "Browser";

// A local interactive preview, not a screenshot or a remote desktop stream.
// Replace this component with the streaming client when sessions are connected.
export function ComputerDesktop({ machine, openApp }: { machine: Machine; openApp: (app: ComputerApp) => void }) {
  const state = useOrbit();
  const files = Object.keys(state.files[machine.id] ?? {});
  const apps = [{ name: "Files" as const, Icon: Folder }, { name: "Terminal" as const, Icon: Terminal }, { name: "Browser" as const, Icon: Globe }];
  const wallpapers = {
    ubuntu: "radial-gradient(ellipse at 85% 15%, #783741 0%, transparent 60%), linear-gradient(135deg, #211b38, #361d31 60%, #513122)",
    windows: "radial-gradient(ellipse at 20% 80%, #225a80 0%, transparent 65%), linear-gradient(140deg, #122639, #1b3e60 50%, #112e3d)",
    macos: "radial-gradient(ellipse at 90% 90%, #625164 0%, transparent 65%), linear-gradient(130deg, #253949, #3d435b 60%, #32343f)",
  };
  return <div className="relative flex min-h-[420px] h-full flex-col overflow-hidden" style={{ background: wallpapers[machine.os] }}>
    <div className="flex h-8 shrink-0 items-center gap-3 bg-black/25 px-4 text-[10px] text-white/65">
      <OsLogo os={machine.os} className="size-3" /><span>{machine.name}</span><span className="ml-auto">Interactive desktop preview</span>
    </div>
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-[#222426]/95 shadow-2xl">
        <div className="flex h-10 items-center gap-2 bg-white/[0.035] px-4">
          <Folder className="size-3.5 text-zinc-500" /><span className="text-xs text-zinc-300">Workspace</span>
          <span className="ml-auto text-[10px] text-zinc-600">/workspace</span>
        </div>
        <div className="min-h-40 p-4">
          {files.length ? files.map(name => <button key={name} onClick={() => openApp("Files")} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-xs text-zinc-300 hover:bg-white/5"><FileText className="size-4 text-zinc-500" /><span className="truncate">{name}</span><span className="ml-auto text-[10px] text-zinc-600">File</span></button>) : <div className="py-8 text-center"><Folder className="mx-auto size-7 text-zinc-600" /><p className="mt-3 text-xs text-zinc-400">Your workspace is ready</p><p className="mt-2 text-[11px] text-zinc-600">Files you or your agent create will appear here.</p></div>}
        </div>
        <div className="flex items-center justify-between bg-black/10 px-4 py-3 text-[10px] text-zinc-500"><span>{files.length} files · persistent storage</span><button onClick={() => openApp("Files")} className="text-zinc-300 hover:text-white">Open files →</button></div>
      </div>
    </div>
    <div className="mx-auto mb-5 flex shrink-0 items-center gap-2 rounded-2xl bg-black/30 p-2 shadow-lg backdrop-blur-xl">
      {apps.map(({ name, Icon }) => <button key={name} onClick={() => openApp(name)} aria-label={"Open " + name} className="group flex w-16 flex-col items-center gap-1.5 rounded-xl px-3 py-2 text-white/70 hover:bg-white/10"><Icon className="size-6" /><span className="text-[10px]">{name}</span></button>)}
    </div>
  </div>;
}
