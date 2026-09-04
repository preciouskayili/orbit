import {
  GridFour as LayoutGrid,
  Monitor,
  DotsThree as MoreHorizontal,
  MagnifyingGlass as Search,
  ShareNetwork as Share2,
  TerminalWindow as TerminalSquare,
} from "@/components/ui/icons";
import type { Machine } from "@orbit/shared";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateMachineDialog } from "@/components/create-machine-dialog";

interface WorkspaceHeaderProps {
  projectId: string;
  machines: Machine[];
  activeMachineId?: string;
}

export function WorkspaceHeader({
  projectId,
  machines,
  activeMachineId,
}: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const activeMachine = machines.find(
    (machine) => machine.id === activeMachineId,
  );

  return (
    <header className="window-drag flex h-[54px] shrink-0 items-center bg-[#1a1a1a] px-3">
      {activeMachine && (
        <Badge
          variant="secondary"
          className="ml-2 h-5 rounded-full bg-emerald-400/10 px-2 text-[10px] font-medium text-emerald-300"
        >
          {activeMachine.status}
        </Badge>
      )}
      <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className={cn(
            "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[12px] transition-colors",
            !activeMachine
              ? "bg-white/[0.065] text-zinc-200"
              : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200",
          )}
        >
          <LayoutGrid className="size-3.5" /> All
        </button>
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() =>
              navigate(`/projects/${projectId}/machines/${machine.id}`)
            }
            className={cn(
              "flex h-8 min-w-0 max-w-[150px] items-center gap-2 rounded-lg px-2.5 text-[12px] transition-colors",
              machine.id === activeMachineId
                ? "bg-white/[0.065] text-zinc-200"
                : "text-zinc-500 hover:bg-white/[0.045] hover:text-zinc-200",
            )}
          >
            <Monitor className="size-3.5 shrink-0" />
            <span className="truncate">{machine.name}</span>
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                machine.status === "running" ? "bg-emerald-400" : "bg-zinc-600",
              )}
            />
          </button>
        ))}
      </nav>

      <div className="ml-2 flex shrink-0 items-center gap-0.5">
        {!activeMachine && <CreateMachineDialog projectId={projectId} />}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              />
            }
          >
            <Search className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-zinc-100 text-zinc-900">
            Search workspace
          </TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <Share2 className="size-3.5" /> Share
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-200"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={7}
            className="w-52 bg-[#292a2c] p-1.5 text-zinc-200 shadow-2xl"
          >
            <DropdownMenuItem className="px-2 py-2 text-[12px] focus:bg-white/[0.07] focus:text-white">
              Rename computer
            </DropdownMenuItem>
            <DropdownMenuItem className="px-2 py-2 text-[12px] focus:bg-white/[0.07] focus:text-white">
              Open session details
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/[0.07]" />
            <DropdownMenuItem className="px-2 py-2 text-[12px] text-rose-300 focus:bg-rose-500/10 focus:text-rose-200">
              Stop computer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
