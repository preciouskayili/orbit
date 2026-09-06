import { Link } from "react-router-dom";
import { orbitActions, type Task } from "@/lib/orbit-store";
import { CircleNotch, DotsThree } from "./ui/icons";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";

export function SidebarSession({ task, selected, indented = false, onDelete }: {
  task: Task;
  selected: boolean;
  indented?: boolean;
  onDelete: () => void;
}) {
  return (
    <div className={"group flex h-8 min-w-0 items-center rounded-lg pr-1 hover:bg-white/[0.05] " + (selected ? "bg-white/[0.055] text-zinc-200" : "text-zinc-500")}>
      <Link
        to={"/sessions/" + task.id}
        onClick={() => orbitActions.openConversation(task.id)}
        aria-current={selected ? "page" : undefined}
        className={"flex h-full min-w-0 flex-1 items-center rounded-lg pr-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 " + (indented ? "pl-10" : "pl-2.5")}
      >
        <span className="truncate">{task.title}</span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={"Session actions for " + task.title}
          title="Session actions"
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-0 hover:bg-white/5 hover:text-zinc-200 focus-visible:opacity-100 focus-visible:outline group-hover:opacity-100 group-focus-within:opacity-100 data-[popup-open]:opacity-100"
        >
          <DotsThree className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onDelete} className="text-rose-300">Delete session</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {task.status === "running" && (
        <span role="status" aria-label={task.title + " is running"} title="Running" className="mx-1 flex shrink-0 items-center text-zinc-400">
          <CircleNotch className="size-3 animate-spin motion-reduce:animate-none" />
        </span>
      )}
      {task.status === "review" && <span title="Ready for review" className="mx-1 size-1.5 shrink-0 rounded-full bg-sky-300" />}
    </div>
  );
}
