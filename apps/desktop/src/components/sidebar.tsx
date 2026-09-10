import { cloudComputersEnabled } from "@/lib/computer-config";
import { SidebarSession } from "./sidebar-session";
import { Button } from "./ui/button";
import { filePreview } from "@/lib/file-preview";
import { OrbitLogo } from "./orbit-logo";
import { CommandPalette } from "./command-palette";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  DotsThree,
  Buildings,
  CaretDown,
  CaretRight,
  Check,
  Folder,
  FolderOpen,
  Gear,
  MagnifyingGlass,
  Monitor,
  Plus,
  SquarePen,
  Sparkle,
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
  { label: "New conversation", path: "/new", icon: SquarePen },
  { label: "Computers", path: "/computers", icon: Monitor },
  { label: "Skills", path: "/skills", icon: Sparkle },
];
export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const state = useOrbit();
  const location = useLocation();
  const navigate = useNavigate();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string>();
  const [deleteId, setDeleteId] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const projects = state.projects.filter(
    (p) => p.workspaceId === state.workspaceId,
  );
  const tasks = state.tasks.filter((t) =>
    projects.some((p) => p.id === t.projectId),
  );
  const deletingProject = projects.find(p => p.id === deleteProjectId);
  const deletingTask = tasks.find((t) => t.id === deleteId);
  const requestDelete = (id: string) => {
    setDeleteError("");
    setDeleteId(id);
  };
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
    <>
      <aside
        hidden={collapsed}
        aria-label="Workspace sidebar"
        className={
          "flex min-h-0 shrink-0 flex-col bg-black/10 " +
          (collapsed ? "hidden" : "w-72")
        }
      >
        <div className="h-[54px] shrink-0 pl-[184px]">
          <div className="window-drag h-full" />
        </div>
        <div
          id="sidebar-content"
          hidden={collapsed}
          className={collapsed ? "hidden" : "flex min-h-0 flex-1 flex-col"}
        >
          <div className="flex h-11 shrink-0 items-center px-5">
            <Link
              to="/new"
              onClick={() => orbitActions.newConversation()}
              className="flex items-center gap-2 text-lg font-bold text-zinc-100"
            >
              <OrbitLogo decorative className="h-6 w-auto shrink-0" />
              Orbit
            </Link>
            <button
              aria-label="Search workspace (⌘K)"
              onClick={() => setSearchOpen(true)}
              className="ml-auto rounded-lg p-2 text-zinc-500 hover:bg-white/5"
            >
              <MagnifyingGlass className="size-4" />
            </button>
            {reviews.length > 0 && (
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
            )}
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
                aria-current={
                  location.pathname === item.path ? "page" : undefined
                }
                className={
                  row +
                  (location.pathname === item.path
                    ? item.path === "/new"
                      ? " text-zinc-100"
                      : " bg-white/[0.065] text-zinc-100"
                    : " text-zinc-200")
                }
              >
                {item.icon === SquarePen ? (
                  <SquarePen className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <item.icon className="size-3.5" />
                )}
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="sidebar-scroll mt-6 min-h-0 flex-1 overflow-y-auto">
            <div className="sidebar-scroll-content pb-4">
              <div className="flex h-8 items-center justify-between">
                <h2 className="text-sm text-zinc-300">Projects</h2>
                <CreateContainer kind="project" compact />
              </div>
              <div className="mt-1 space-y-1">
                {projects.map((project) => {
                  const expanded = !closed.has(project.id);
                  const Icon = expanded ? FolderOpen : Folder;
                  return (
                    <div key={project.id}>
                      <div className="flex items-center">
                        <button
                          aria-label={"Toggle " + project.name}
                          aria-expanded={expanded}
                          aria-controls={"project-sessions-" + project.id}
                          onClick={() =>
                            setClosed((current) => {
                              const next = new Set(current);
                              if (next.has(project.id)) next.delete(project.id);
                              else next.add(project.id);
                              return next;
                            })
                          }
                          className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-left text-sm text-zinc-300 hover:text-zinc-200"
                        >
                          <CaretRight
                            className={
                              "size-3 shrink-0 transition-transform " +
                              (expanded ? "rotate-90" : "")
                            }
                          />
                          <Icon className="size-3.5 shrink-0" />
                          <span className="truncate">{project.name}</span>
                        </button>
                        <DropdownMenu><DropdownMenuTrigger aria-label={"Folder actions for " + project.name} className="rounded-md p-1 text-zinc-500 hover:bg-white/5"><DotsThree className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuGroup><DropdownMenuItem className="text-rose-300" onClick={() => { setDeleteError(''); setDeleteProjectId(project.id); }}>Delete folder</DropdownMenuItem></DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
                        <button
                          aria-label={"New session in " + project.name}
                          title="New session"
                          disabled={
                            !state.agents.some(
                              (a) => a.workspaceId === state.workspaceId,
                            )
                          }
                          onClick={() => {
                            const id = orbitActions.createSession(project.id);
                            setClosed((current) => {
                              const next = new Set(current);
                              next.delete(project.id);
                              return next;
                            });
                            navigate("/sessions/" + id);
                          }}
                          className="bg-transparent p-2 text-zinc-500 hover:text-zinc-200 disabled:opacity-30 focus-visible:outline focus-visible:outline-2"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      {expanded && (
                        <div
                          id={"project-sessions-" + project.id}
                          className="mt-1 space-y-0.5"
                        >
                          {!tasks.some((t) => t.projectId === project.id) &&
                            !projectComputers(state, project.id).length && (
                              <p className="py-2 pl-10 text-xs text-zinc-600">
                                No sessions yet
                              </p>
                            )}
                          {tasks
                            .filter((t) => t.projectId === project.id)
                            .map((task) => (
                              <SidebarSession
                                key={task.id}
                                task={task}
                                indented
                                selected={
                                  task.id ===
                                  state.activeConversations[state.workspaceId]
                                }
                                onDelete={() => requestDelete(task.id)}
                              />
                            ))}
                          {projectComputers(state, project.id).map((m) => (
                            <Link
                              key={m.id}
                              to={"/computers/" + m.id}
                              className={row + " !pl-10 text-zinc-300"}
                            >
                              <Monitor className="size-3.5 shrink-0 text-zinc-500" />
                              <span className="truncate">{m.name}</span>
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
              <h2 className="mt-7 px-2.5 py-2 text-sm text-zinc-400">
                Recents
              </h2>
              {tasks.slice(0, 15).map((task) => (
                <SidebarSession
                  key={task.id}
                  task={task}
                  selected={
                    task.id === state.activeConversations[state.workspaceId]
                  }
                  onDelete={() => requestDelete(task.id)}
                />
              ))}
              {!tasks.length && (
                <p className="px-2.5 py-2 text-xs text-zinc-400">
                  Your conversations will appear here.
                </p>
              )}
            </div>
          </div>
          <footer className="shrink-0 px-4 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="mt-2 flex h-14 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#34465c] text-[11px] text-zinc-200">
                  {initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-200">
                    {state.settings.name}
                  </span>
                  <span className="mt-px block truncate text-[11px] text-zinc-500">
                    {workspace.name}
                  </span>
                </span>
                <CaretDown className="size-3 text-zinc-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-64">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  {state.workspaces.filter(w => !cloudComputersEnabled || w.id === state.workspaceId).map((w) => (
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
        </div>
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
      <Dialog
        open={Boolean(deletingTask)}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(undefined);
        }}
      >
        <DialogContent className="p-6">
          <DialogTitle>Delete session?</DialogTitle>
          <DialogDescription className="mt-2">
            Delete “{deletingTask?.title}” and its messages? Its computers and
            their files will stay available.
          </DialogDescription>
          {deleteError && (
            <p role="alert" className="mt-3 text-xs text-rose-300">
              {deleteError}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteId(undefined)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                if (!deletingTask) return;
                const id = deletingTask.id;
                const currentRoute =
                  /^\/(?:sessions|tasks)\/([^/]+)/.exec(
                    location.pathname,
                  )?.[1] === id;
                const active =
                  state.activeConversations[state.workspaceId] === id;
                setDeleting(true);
                try {
                  await orbitActions.deleteConversation(id);
                  if (active || currentRoute) filePreview.close();
                  if (currentRoute) navigate("/new", { replace: true });
                  setDeleteId(undefined);
                } catch (cause) {
                  setDeleteError((cause as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Delete session"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(deletingProject)} onOpenChange={open => { if (!open && !deleting) setDeleteProjectId(undefined); }}><DialogContent className="p-6"><DialogTitle>Delete folder?</DialogTitle><DialogDescription className="mt-2">Delete “{deletingProject?.name}” and its {tasks.filter(t => t.projectId === deleteProjectId).length} sessions? Active agents will stop. Computers and their files will stay available.</DialogDescription>{deleteError && <p role="alert" className="mt-3 text-xs text-rose-300">{deleteError}</p>}<div className="mt-5 flex justify-end gap-2"><Button variant="ghost" disabled={deleting} onClick={() => setDeleteProjectId(undefined)}>Cancel</Button><Button variant="destructive" disabled={deleting} onClick={async () => { if (!deletingProject) return; setDeleting(true); try { await orbitActions.deleteProject(deletingProject.id); filePreview.close(); navigate('/new', { replace: true }); setDeleteProjectId(undefined); } catch(e) { setDeleteError((e as Error).message); } finally { setDeleting(false); } }}>{deleting ? 'Deleting…' : 'Delete folder'}</Button></div></DialogContent></Dialog>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
