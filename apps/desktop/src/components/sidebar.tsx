import {
  Bell,
  SquaresFour as Blocks,
  Robot as Bot,
  CaretDown as ChevronDown,
  CaretRight as ChevronRight,
  Clock as Clock3,
  Folder,
  GitPullRequest,
  Question as HelpCircle,
  SignOut as LogOut,
  ChatCircleDots as MessageSquarePlus,
  SidebarSimple as PanelLeft,
  MagnifyingGlass as Search,
  Gear as Settings,
} from "@/components/ui/icons";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/queries";

const primaryNavigation = [
  { label: "New task", icon: MessageSquarePlus, shortcut: "⌘N" },
  { label: "Pull requests", icon: GitPullRequest },
  { label: "Agents", icon: Bot },
  { label: "Scheduled", icon: Clock3 },
  { label: "Skills", icon: Blocks },
];

const recentSessions = [
  { label: "Verify the Trace release", path: "/projects/trace/machines/ubuntu-dev", unread: true },
  { label: "Review the returns flow", path: "/projects/trace/machines/windows-qa" },
  { label: "Prepare the macOS build", path: "/projects/trace/machines/mac-build" },
  { label: "Debug agent handoff", path: "/projects/grasp/machines/grasp-linux" },
  { label: "Audit fleet credentials", path: "/projects/trace" },
  { label: "Compare browser snapshots", path: "/projects/grasp/machines/grasp-windows" },
  { label: "Provision an Ubuntu workspace", path: "/projects/grasp" },
  { label: "Inspect the failed CI run", path: "/projects/trace/machines/ubuntu-dev" },
  { label: "Summarize computer activity", path: "/projects/personal" },
  { label: "Stage the desktop artifact", path: "/projects/trace/machines/mac-build" },
  { label: "Check persistent storage", path: "/projects/personal/machines/personal-mac" },
];

export function Sidebar({ projectId }: { projectId: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: projects = [] } = useProjects();
  const activeMachineId = location.pathname.match(/\/machines\/([^/]+)/)?.[1];
  const activeTask =
    activeMachineId === "windows-qa"
      ? "Review returns flow"
      : activeMachineId === "mac-build"
        ? "Prepare desktop build"
        : activeMachineId
          ? "Release verification"
          : "All computers";

  return (
    <aside className="flex w-72 shrink-0 flex-col px-3 pb-3 bg-transparent">
      <div className="window-drag flex h-[54px] shrink-0 items-center justify-end gap-1 pr-1">
        <Tooltip>
          <TooltipTrigger className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200">
            <PanelLeft className="size-[17px]" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">
            Toggle sidebar
          </TooltipContent>
        </Tooltip>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300"
          aria-label="Back"
        >
          <ChevronRight className="size-4 rotate-180" />
        </button>
        <button
          className="flex size-8 items-center justify-center rounded-lg text-zinc-700 hover:text-zinc-300"
          aria-label="Forward"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="flex h-11 items-center px-2">
        <p className="text-lg font-medium text-zinc-500">Orbit</p>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger className="flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200">
              <Search className="size-[17px]" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">
              Search <span className="ml-1 text-zinc-500">⌘K</span>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger className="relative flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200">
              <Bell className="size-[17px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#e36b4d]" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">
              Notifications
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <nav className="mt-2 space-y-0.5 px-1">
        {primaryNavigation.map((item) => (
          <button
            key={item.label}
            className="group flex h-8 w-full items-center gap-1 gap-x-3 rounded-lg px-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.055] hover:text-white"
          >
            <item.icon
              className="size-[14px] shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-200"
              weight="regular"
            />
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="ml-auto text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100">
                {item.shortcut}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-7 min-h-0 flex-1 overflow-y-auto px-1 pb-4">
        <div className="flex h-8 items-center px-2.5">
          <span className="text-sm font-medium text-zinc-500">Projects</span>
        </div>

        <div className="mt-1 space-y-1">
          {projects.map((project) => {
            const active = project.id === projectId;
            return (
              <div key={project.id}>
                <button
                  onClick={() => navigate(`/projects/${project.id}`)}
                  className="group flex h-8 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-zinc-100"
                >
                  <Folder
                    className="size-[14px] shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-200"
                    weight="regular"
                  />
                  <span className="min-w-0 flex-1 truncate">{project.name}</span>
                </button>

                {active && (
                  <button
                    onClick={() => navigate(location.pathname)}
                    className="mt-1 flex h-8 w-full items-center rounded-xl bg-white/[0.075] pl-[42px] pr-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.1] hover:text-zinc-100"
                  >
                    <span className="truncate">{activeTask}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex h-8 items-center px-2.5">
          <span className="text-sm font-medium text-zinc-500">Recents</span>
        </div>
        <div className="mt-1 space-y-0.5">
          {recentSessions.map((session) => (
            <button
              key={session.label}
              onClick={() => navigate(session.path)}
              className="group flex h-8 w-full items-center rounded-lg px-2.5 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.045] hover:text-zinc-100"
            >
              <span className="min-w-0 flex-1 truncate">{session.label}</span>
              {session.unread && (
                <span className="ml-3 size-2 shrink-0 rounded-full bg-[#7db7ff]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-white/[0.065]" />

      <DropdownMenu>
        <DropdownMenuTrigger className="mt-1 flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left outline-none hover:bg-white/[0.05]">
          <span className="flex size-8 items-center justify-center rounded-full bg-[#34465c] text-[11px] font-medium text-zinc-200">
            PK
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200">
            Precious Kayili
          </span>
          <ChevronDown className="size-4 text-zinc-600" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="top"
          sideOffset={8}
          className="w-60 border border-white/[0.08] bg-[#252628] p-1.5 text-zinc-200 shadow-2xl"
        >
          <DropdownMenuLabel className="px-2 py-1.5 text-[11px] text-zinc-500">
            precious@orbit.dev
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => navigate("/settings")}
            className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white"
          >
            <Settings className="size-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="px-2 py-2 text-[13px] focus:bg-white/[0.07] focus:text-white">
            <HelpCircle className="size-4" /> Help and feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.07]" />
          <DropdownMenuItem className="px-2 py-2 text-[13px] text-rose-300 focus:bg-rose-500/10 focus:text-rose-200">
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </aside>
  );
}
