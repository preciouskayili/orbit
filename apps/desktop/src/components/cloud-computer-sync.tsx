import { useEffect, useState } from "react";
import { useOrbit } from "@/hooks/use-orbit";
import { cloudComputersEnabled } from "@/lib/computer-config";
import { cloudComputers } from "@/lib/cloud-computers";

export function CloudComputerSync() {
  const { workspaceId } = useOrbit();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!cloudComputersEnabled) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    setError("");
    async function refresh() {
      try {
        await cloudComputers.refresh(workspaceId);
        if (active) setError("");
      } catch (cause) {
        if (active) setError((cause as Error).message);
      } finally {
        if (active) timer = setTimeout(() => void refresh(), 10_000);
      }
    }
    void refresh();
    return () => { active = false; clearTimeout(timer); };
  }, [workspaceId, retry]);
  if (!cloudComputersEnabled || !error) return null;
  return <div role="alert" className="flex shrink-0 items-center gap-3 bg-amber-500/5 px-4 py-2 text-xs text-amber-200/80">
    <span className="flex-1">{error}</span>
    <button onClick={() => setRetry((value) => value + 1)} className="underline">Retry</button>
  </div>;
}
