import { Bell, Database, HardDrive, Keyboard, MonitorCog, ShieldCheck } from "lucide-react";
import { TopBar } from "@/components/top-bar";

const settings = [
  { icon: MonitorCog, title: "Desktop", description: "Launch behavior and appearance", value: "System default" },
  { icon: Keyboard, title: "Keyboard shortcuts", description: "Workspace and machine controls", value: "Configure" },
  { icon: Bell, title: "Notifications", description: "Agent and machine activity", value: "Not connected" },
  { icon: HardDrive, title: "Local storage", description: "Cached project and session data", value: "Mock data only" },
  { icon: Database, title: "API endpoint", description: "Current Orbit backend", value: "127.0.0.1:4000" },
  { icon: ShieldCheck, title: "Security", description: "Renderer isolation and native permissions", value: "Isolated" },
];

export function SettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <TopBar eyebrow="Orbit" title="Settings" description="Desktop preferences and local development configuration" />
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4">
            <h2 className="text-[11px] font-medium text-zinc-300">Application</h2>
            <p className="mt-1 text-[9px] text-zinc-700">These controls establish the shape of future settings. Most are intentionally inactive.</p>
          </div>
          <div className="overflow-hidden rounded-lg border border-line bg-panel">
            {settings.map((setting, index) => (
              <button key={setting.title} disabled className={`flex w-full items-center gap-3 px-3 py-3.5 text-left ${index !== settings.length - 1 ? "border-b border-line" : ""}`}>
                <span className="flex size-8 items-center justify-center rounded-md bg-white/[0.035] text-zinc-600"><setting.icon className="size-3.5" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-zinc-400">{setting.title}</span><span className="mt-0.5 block text-[9px] text-zinc-700">{setting.description}</span></span>
                <span className="text-[9px] text-zinc-600">{setting.value}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-amber-400/10 bg-amber-400/[0.025] px-4 py-3">
            <p className="text-[10px] font-medium text-zinc-400">Foundation mode</p>
            <p className="mt-1 text-[9px] leading-4 text-zinc-700">Cloud providers, credentials, remote streaming, authentication, billing, and real agent execution are intentionally not configured.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
