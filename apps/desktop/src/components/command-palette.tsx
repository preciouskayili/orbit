import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { MagnifyingGlass } from "./ui/icons";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { orbitActions } from "@/lib/orbit-store";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const state = useOrbit();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const projects = state.projects.filter(
    (p) => p.workspaceId === state.workspaceId,
  );
  const items = [
    { label: "New conversation", kind: "Action", path: "/new" },
    { label: "All computers", kind: "Navigate", path: "/computers" },
    { label: "Skills & instructions", kind: "Navigate", path: "/skills" },
    { label: "Settings & workspaces", kind: "Navigate", path: "/settings" },
    ...projects.map((p) => ({
      label: p.name,
      kind: "Project",
      path: "/projects/" + p.id,
    })),
    ...workspaceComputers(state).map((m) => ({
      label: m.name,
      kind: "Computer",
      path: "/computers/" + m.id,
    })),
    ...state.tasks
      .filter((t) => projects.some((p) => p.id === t.projectId))
      .map((t) => ({
        label: t.title,
        kind: "Conversation",
        path: "/sessions/" + t.id,
      })),
  ].filter((item) =>
    (item.label + " " + item.kind)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [open, onOpenChange]);
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  useEffect(() => {
    list.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [active]);
  function choose(index: number) {
    const item = items[index];
    if (!item) return;
    if (item.path === "/new") orbitActions.newConversation();
    if (item.kind === "Conversation")
      orbitActions.openConversation(item.path.split("/").pop()!);
    navigate(item.path);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl overflow-hidden"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search and commands</DialogTitle>
        <DialogDescription className="sr-only">
          Search computers, projects and conversations, or jump to a page. Use
          arrow keys and Enter to select.
        </DialogDescription>
        <div className="flex items-center gap-3 px-5 py-4">
          <MagnifyingGlass className="size-5 text-zinc-500" />
          <input
            autoFocus
            role="combobox"
            aria-label="Search commands"
            aria-expanded="true"
            aria-controls="command-results"
            aria-autocomplete="list"
            aria-activedescendant={
              items[active] ? "command-" + active : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) =>
                  items.length
                    ? (i + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
                      items.length
                    : 0,
                );
              }
              if (e.key === "Enter") {
                e.preventDefault();
                choose(active);
              }
            }}
            placeholder="Search or jump to…"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-200 outline-none placeholder:text-zinc-500"
          />
          <kbd className="rounded bg-white/5 px-1.5 py-1 text-[10px] text-zinc-500">
            esc
          </kbd>
        </div>
        <div
          ref={list}
          id="command-results"
          role="listbox"
          aria-label="Results"
          className="max-h-80 overflow-y-auto p-2"
        >
          {items.map((item, index) => (
            <div
              key={item.path}
              role="option"
              id={"command-" + index}
              aria-selected={active === index}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(index)}
              className={
                "flex cursor-default items-center gap-3 rounded-lg px-3 py-3 text-sm " +
                (active === index
                  ? "bg-white/[0.075] text-zinc-100"
                  : "text-zinc-400")
              }
            >
              <span className="truncate">{item.label}</span>
              <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
                {item.kind}
              </span>
            </div>
          ))}
          {!items.length && (
            <p className="p-8 text-center text-sm text-zinc-500">
              No results for “{query}”
            </p>
          )}
        </div>
        <div className="flex gap-4 bg-black/10 px-5 py-3 text-[11px] text-zinc-500">
          <span>↑ ↓ to navigate</span>
          <span>↵ to open</span>
          <span className="ml-auto">⌘ K</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
