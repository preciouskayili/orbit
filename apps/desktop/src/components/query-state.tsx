import {
  CircleNotch as LoaderCircle,
  WarningCircle as AlertCircle,
} from "@/components/ui/icons";

export function LoadingState({ label = "Loading workspace" }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center text-[10px] text-zinc-600">
      <LoaderCircle className="mr-2 size-3.5 animate-spin" /> {label}…
    </div>
  );
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-lg border border-rose-400/15 bg-rose-400/[0.035] px-4 py-3 text-[10px] text-rose-300">
        <AlertCircle className="mr-2 inline size-3.5" /> {error.message}
      </div>
    </div>
  );
}
