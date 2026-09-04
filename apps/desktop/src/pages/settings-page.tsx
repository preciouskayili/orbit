import {
  Bell,
  Database,
  DesktopTower as MonitorCog,
  HardDrive,
  Keyboard,
  ShieldCheck,
} from "@/components/ui/icons";
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
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <h2 className="text-[14px] font-medium text-zinc-200">Application</h2>
            <p className="mt-1 text-[12px] text-zinc-600">Desktop behavior, notifications, and local development.</p>
          </div>
          <div className="space-y-1">
            {settings.map((setting) => (
              <button key={setting.title} disabled className="flex w-full items-center gap-4 rounded-xl bg-[#1c1c1c] px-4 py-4 text-left transition-colors hover:bg-[#222222]">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-500"><setting.icon className="size-4" /></span>
                <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium text-zinc-300">{setting.title}</span><span className="mt-1 block text-[11px] text-zinc-600">{setting.description}</span></span>
                <span className="text-[11px] text-zinc-500">{setting.value}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-amber-400/[0.045] px-4 py-4">
            <p className="text-[12px] font-medium text-zinc-300">Foundation mode</p>
            <p className="mt-1 text-[11px] leading-5 text-zinc-600">Cloud providers, credentials, remote streaming, authentication, billing, and real agent execution are intentionally not configured.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
