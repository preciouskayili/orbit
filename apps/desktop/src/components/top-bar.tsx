import type { ReactNode } from "react";

interface TopBarProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function TopBar({ eyebrow, title, description, actions }: TopBarProps) {
  return (
    <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-line px-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {eyebrow && <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">{eyebrow}</span>}
          <h1 className="truncate text-[13px] font-semibold text-zinc-100">{title}</h1>
        </div>
        {description && <p className="mt-0.5 truncate text-[11px] text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
