import type { ReactNode } from "react";
import { Monitor } from "./ui/icons";

// Shared by an empty fleet, project, or session. Keep the action at the point
// where it is needed; callers own provisioning, navigation, and permissions.
export function ComputerEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="relative mb-7 flex h-24 w-32 items-center justify-center rounded-2xl bg-white/[0.035]"
      >
        <div className="absolute -right-2 -top-2 size-9 rounded-xl bg-[#242626]" />
        <Monitor weight="thin" className="relative size-12 text-zinc-500" />
        <span className="absolute bottom-5 right-8 size-1.5 rounded-full bg-sky-300/60" />
      </div>
      <h2 className="text-lg font-medium tracking-tight text-zinc-200">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
        {description}
      </p>
      {children && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {children}
        </div>
      )}
    </section>
  );
}
