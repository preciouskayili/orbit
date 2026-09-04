import {
  Bell,
  Blocks,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Code2,
  Command,
  Cpu,
  FlaskConical,
  GitPullRequest,
  HelpCircle,
  LogOut,
  MessageSquarePlus,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/queries";

const primaryNavigation = [
  { label: "New task", icon: MessageSquarePlus, shortcut: "⌘N" },
  { label: "Pull requests", icon: GitPullRequest },
  { label: "Agents", icon: Bot },
  { label: "Scheduled", icon: Clock3 },
  { label: "Skills", icon: Blocks },
];

const projectAppearance = [
  { icon: Code2, color: "text-[#e47a57]" },
  { icon: Sparkles, color: "text-[#5b9cf0]" },
  { icon: FlaskConical, color: "text-[#68bd7a]" },
];

export function Sidebar({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects = [] } = useProjects();

  return (
    <aside className="flex w-[252px] shrink-0 flex-col bg-[#1b1c1e]/88 px-3 pb-3 backdrop-blur-2xl">
      <div className="window-drag flex h-[54px] shrink-0 items-center justify-end gap-1 pr-1">
        <Tooltip>
          <TooltipTrigger className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"><PanelLeft className="size-[17px]" /></TooltipTrigger>
          <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">Toggle sidebar</TooltipContent>
        </Tooltip>
        <button className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300" aria-label="Back"><ChevronRight className="size-4 rotate-180" /></button>
        <button className="flex size-8 items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300" aria-label="Forward"><ChevronRight className="size-4" /></button>
      </div>

      <div className="flex h-11 items-center px-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-w-0 items-center gap-1.5 rounded-lg px-1 py-1 text-left outline-none hover:bg-white/[0.045]">
            <span className="truncate text-[17px] font-semibold tracking-[-0.02em] text-zinc-200">Orbit</span>
            <ChevronDown className="size-4 text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={6} className="w-60 border border-white/[0.08] bg-[#252628] p-1.5 text-zinc-200 shadow-2xl">
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-zinc-500">Workspace</DropdownMenuLabel>
            <DropdownMenuItem className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"><Check className="size-4 text-emerald-400" /> Precious&apos;s fleet</DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"><Plus className="size-4" /> New workspace</DropdownMenuItem>
            <DropdownMenuItem className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"><Settings className="size-4" /> Workspace settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"><Search className="size-[17px]" /></TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">Search <span className="ml-1 text-zinc-500">⌘K</span></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="relative flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"><Bell className="size-[17px]" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#e36b4d]" /></TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">Notifications</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <nav className="mt-2 space-y-0.5 px-1">
        {primaryNavigation.map((item) => (
          <button key={item.label} className="group flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[14px] text-zinc-300 transition-colors hover:bg-white/[0.055] hover:text-white">
            <item.icon className="size-[18px] shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-200" strokeWidth={1.75} />
            <span>{item.label}</span>
            {item.label === "Agents" && <Badge variant="secondary" className="ml-auto h-5 rounded-full border-0 bg-white/[0.06] px-1.5 text-[10px] font-normal text-zinc-500">2</Badge>}
            {item.shortcut && <span className="ml-auto text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100">{item.shortcut}</span>}
          </button>
        ))}
      </nav>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-1">
        <div className="flex h-7 items-center px-2.5">
          <span className="text-[12px] font-medium text-zinc-600">Projects</span>
          <button className="ml-auto flex size-6 items-center justify-center rounded-md text-zinc-600 hover:bg-white/[0.05] hover:text-zinc-300" aria-label="New project"><Plus className="size-3.5" /></button>
        </div>

        <div className="mt-1 space-y-0.5">
          {projects.map((project, index) => {
            const appearance = projectAppearance[index % projectAppearance.length]!;
            const active = project.id === projectId;
            return (
              <button key={project.id} onClick={() => navigate(`/projects/${project.id}`)} className={`group flex h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-[14px] transition-colors ${active ? "bg-white/[0.06] text-zinc-100" : "text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-200"}`}>
                <appearance.icon className={`size-[18px] shrink-0 ${appearance.color}`} strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {active && <span className="size-2 rounded-full border-2 border-zinc-500 border-t-transparent" />}
              </button>
            );
          })}
        </div>

        <button className="mt-6 flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-zinc-600 hover:text-zinc-300">Recents <ChevronRight className="size-3.5" /></button>
        <div className="space-y-0.5">
          <button onClick={() => navigate(`/projects/${projectId}/machines/ubuntu-dev`)} className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] ${location.pathname.includes("ubuntu-dev") ? "bg-white/[0.05] text-zinc-300" : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"}`}><Cpu className="size-4 text-[#e47a57]" /> Release verification</button>
          <button className="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"><Command className="size-4" /> Browser QA run</button>
        </div>
      </div>

      <Separator className="my-2 bg-white/[0.065]" />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left outline-none hover:bg-white/[0.05]">
          <span className="relative flex size-8 items-center justify-center rounded-full bg-[#303236] text-[12px] font-medium text-zinc-300">PK<span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-400 ring-2 ring-[#1b1c1e]" /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-zinc-300">Precious Kayili</span><span className="mt-0.5 block truncate text-[11px] text-zinc-600">Builder workspace</span></span>
          <ChevronDown className="size-4 text-zinc-600" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-60 border border-white/[0.08] bg-[#252628] p-1.5 text-zinc-200 shadow-2xl">
          <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-zinc-500">precious@orbit.dev</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => navigate("/settings")} className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"><Settings className="size-4" /> Settings</DropdownMenuItem>
          <DropdownMenuItem className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"><HelpCircle className="size-4" /> Help and feedback</DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.07]" />
          <DropdownMenuItem className="px-2 py-2 text-[13px] text-rose-300 focus:bg-rose-500/10 focus:text-rose-200"><LogOut className="size-4" /> Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
