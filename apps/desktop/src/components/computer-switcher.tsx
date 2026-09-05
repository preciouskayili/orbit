import type { Machine } from "@orbit/shared";
import { useNavigate } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { OsLogo } from "./os-logo";
import { CaretDown } from "./ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function ComputerSwitcher({ machine }: { machine: Machine }) {
  const state = useOrbit();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch computer"
        className="flex min-w-0 items-center gap-2 text-sm text-zinc-200"
      >
        <span className="truncate">{machine.name}</span>
        <CaretDown className="size-3 text-zinc-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuItem onClick={() => navigate("/computers")}>
          All computers
        </DropdownMenuItem>
        {workspaceComputers(state).map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => navigate("/computers/" + m.id)}
          >
            <OsLogo os={m.os} className="size-4" />
            <span className="truncate">{m.name}</span>
            {m.id === machine.id && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
