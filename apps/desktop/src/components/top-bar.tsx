import type { ReactNode } from "react";

interface TopBarProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function TopBar({ eyebrow, title, description, actions }: TopBarProps) {
  return (
    <header className="flex h-[54px] shrink-0 items-center justify-between bg-[#1a1a1a] px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {eyebrow && <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#db7657]">{eyebrow}</span>}
          <h1 className="truncate text-[14px] font-medium text-zinc-100">{title}</h1>
        </div>
        {description && <p className="mt-0.5 truncate text-[11px] text-zinc-600">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
