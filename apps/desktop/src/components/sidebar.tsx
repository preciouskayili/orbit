import { CommandPalette } from "./command-palette";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Buildings,
  CaretDown,
  CaretRight,
  Check,
  Folder,
  FolderOpen,
  Gear,
  MagnifyingGlass,
  Monitor,
  Robot,
  ChatCircleDots,
} from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CreateContainer } from "@/components/flow-ui";
import { useOrbit } from "@/hooks/use-orbit";
import { projectComputers } from "@/lib/orbit-selectors";
import { orbitActions } from "@/lib/orbit-store";

const navigation = [
  { label: "New conversation", path: "/new", icon: ChatCircleDots },
  { label: "Computers", path: "/computers", icon: Monitor },
  { label: "Agents", path: "/agents", icon: Robot },
];
export function Sidebar() {
  const state = useOrbit();
  const location = useLocation();
  const navigate = useNavigate();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const projects = state.projects.filter(
    (p) => p.workspaceId === state.workspaceId,
  );
  const tasks = state.tasks.filter((t) =>
    projects.some((p) => p.id === t.projectId),
  );
  const workspace = state.workspaces.find((w) => w.id === state.workspaceId)!;
  const reviews = tasks.filter((t) => t.status === "review");
  const initials = state.settings.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const row =
    "flex h-8 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400";
  return (
    <aside className="flex min-h-0 w-72 shrink-0 flex-col bg-black/10">
      <div className="window-drag h-[54px] shrink-0" />
      <div className="flex h-11 shrink-0 items-center px-5">
        <Link
          to="/new"
          onClick={() => orbitActions.newConversation()}
          className="text-lg font-medium text-zinc-100"
        >
          Orbit
        </Link>
        <button
          aria-label="Search workspace (⌘K)"
          onClick={() => setSearchOpen(true)}
          className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-white/5"
        >
          <MagnifyingGlass className="size-4" />
        </button>
        <button
          aria-label="Notifications"
          onClick={() => setNotifications(true)}
          className="relative rounded-lg p-2 text-zinc-500 hover:bg-white/5"
        >
          <Bell className="size-4" />
          {reviews.length > 0 && state.settings.notifications && (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-sky-300" />
          )}
        </button>
      </div>
      <nav
        aria-label="Main navigation"
        className="mt-2 shrink-0 space-y-0.5 px-4"
      >
        {navigation.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => {
              if (item.path === "/new") orbitActions.newConversation();
            }}
            aria-current={location.pathname === item.path ? "page" : undefined}
            className={
              row +
              (location.pathname === item.path
                ? " bg-white/[0.065] text-zinc-100"
                : " text-zinc-400")
            }
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="sidebar-scroll mt-6 min-h-0 flex-1 overflow-y-auto">
        <div className="sidebar-scroll-content pb-4">
          <div className="flex h-8 items-center justify-between px-2.5">
            <h2 className="text-sm text-zinc-500">Projects</h2>
            <CreateContainer kind="project" compact />
          </div>
          <div className="mt-1 space-y-1">
            {projects.map((project) => {
              const expanded = !closed.has(project.id);
              const Icon = expanded ? FolderOpen : Folder;
              return (
                <div key={project.id}>
                  <button
                    onClick={() =>
                      setClosed((current) => {
                        const next = new Set(current);
                        if (next.has(project.id)) next.delete(project.id);
                        else next.add(project.id);
                        return next;
                      })
                    }
                    aria-expanded={expanded}
                    className={row + " text-zinc-300"}
                  >
                    <Icon className="size-3.5 text-zinc-500" />
                    <span className="min-w-0 flex-1 truncate">
                      {project.name}
                    </span>
                    <CaretRight
                      className={
                        "size-3 text-zinc-600 " + (expanded ? "rotate-90" : "")
                      }
                    />
                  </button>
                  {expanded && (
                    <div className="mt-1 space-y-0.5">
                      <Link
                        to={"/projects/" + project.id}
                        className={row + " !pl-10 text-zinc-500"}
                      >
                        Open project
                        <CaretRight className="ml-auto size-3" />
                      </Link>
                      {projectComputers(state, project.id).map((m) => (
                        <Link
                          key={m.id}
                          to={"/computers/" + m.id}
                          className={row + " !pl-10 text-zinc-400"}
                        >
                          <Monitor className="size-3.5 shrink-0 text-zinc-500" />
                          <span className="truncate">{m.name}</span>
                        </Link>
                      ))}
                      {tasks
                        .filter((t) => t.projectId === project.id)
                        .slice(0, 3)
                        .map((task) => (
                          <Link
                            key={task.id}
                            to={"/sessions/" + task.id}
                            onClick={() =>
                              orbitActions.openConversation(task.id)
                            }
                            className={
                              row +
                              " !pl-10 " +
                              (location.pathname === "/sessions/" + task.id
                                ? "bg-white/[0.075] text-zinc-200"
                                : "text-zinc-500")
                            }
                          >
                            <span className="truncate">{task.title}</span>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
            {!projects.length && (
              <p className="px-2.5 py-3 text-xs text-zinc-600">
                Create a project to organize your fleet.
              </p>
            )}
          </div>
          <h2 className="mt-7 px-2.5 py-2 text-sm text-zinc-500">Recents</h2>
          {tasks.slice(0, 15).map((task) => (
            <Link
              key={task.id}
              to={"/sessions/" + task.id}
              onClick={() => orbitActions.openConversation(task.id)}
              className={row + " text-zinc-400"}
            >
              <span className="min-w-0 flex-1 truncate">{task.title}</span>
              {task.status === "review" && (
                <span className="size-2 rounded-full bg-sky-300" />
              )}
            </Link>
          ))}
          {!tasks.length && (
            <p className="px-2.5 py-2 text-xs text-zinc-600">
              Your conversations will appear here.
            </p>
          )}
        </div>
      </div>
      <footer className="shrink-0 px-4 pb-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="mt-2 flex h-14 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#34465c] text-[11px] text-zinc-200">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-zinc-200">
                {state.settings.name}
              </span>
              <span className="mt-1 block truncate text-[11px] text-zinc-500">
                {workspace.name}
              </span>
            </span>
            <CaretDown className="size-3 text-zinc-500" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-64">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              {state.workspaces.map((w) => (
                <DropdownMenuItem
                  key={w.id}
                  onClick={() => {
                    orbitActions.switchWorkspace(w.id);
                    navigate("/computers");
                  }}
                >
                  {w.id === state.workspaceId ? (
                    <Check className="size-4 text-emerald-300" />
                  ) : (
                    <Buildings className="size-4" />
                  )}
                  {w.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Gear className="size-4" />
                Settings & workspaces
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </footer>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Dialog open={notifications} onOpenChange={setNotifications}>
        <DialogContent className="p-6">
          <DialogTitle>Notifications</DialogTitle>
          <DialogDescription className="mt-2">
            Agent results waiting for your review.
          </DialogDescription>
          <div className="mt-5 space-y-2">
            {reviews.map((t) => (
              <Link
                key={t.id}
                to={"/sessions/" + t.id}
                onClick={() => {
                  orbitActions.openConversation(t.id);
                  setNotifications(false);
                }}
                className="block rounded-xl bg-white/5 p-3 text-sm text-zinc-300"
              >
                {t.title}
                <span className="mt-1 block text-xs text-sky-300">
                  Ready for review
                </span>
              </Link>
            ))}
            {!reviews.length && (
              <p className="text-sm text-zinc-500">You're all caught up.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
