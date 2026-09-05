import { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/core/rfb.js";
import type { Machine } from "@orbit/shared";
import { cloudComputers } from "@/lib/cloud-computers";
import { Button } from "./ui/button";

// noVNC owns the live canvas and input forwarding. Signed connection URLs live
// only in this effect and are never stored with the persisted computer record.
export function RemoteDesktop({ machine }: { machine: Machine }) {
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (machine.status !== "running" || !machine.workspaceId) return;
    let active = true;
    let client: RFB | undefined;
    let timeout: ReturnType<typeof setTimeout>;
    setConnected(false);
    setError("");
    const timer = setTimeout(() => {
      void cloudComputers.desktop(machine.workspaceId!, machine.id).then((session) => {
        if (!active || !target.current) return;
        const url = new URL(session.url);
        if (url.protocol !== "wss:") throw new Error("Invalid desktop connection address.");
        client = new RFB(target.current, url.href, { shared: true });
        client.scaleViewport = true;
        client.resizeSession = false;
        client.background = "#111111";
        client.addEventListener("connect", () => {
          clearTimeout(timeout);
          if (active) { setConnected(true); setError(""); }
        });
        client.addEventListener("disconnect", () => {
          clearTimeout(timeout);
          if (active) { setConnected(false); setError("Desktop disconnected. Reconnect to continue."); }
        });
        client.addEventListener("securityfailure", () => {
          if (active) setError("Desktop access expired or was refused. Reconnect to request fresh access.");
        });
        client.addEventListener("credentialsrequired", () => {
          if (active) setError("This desktop image requires a VNC password. Use the configured Daytona desktop image.");
        });
        timeout = setTimeout(() => {
          if (active) setError("Desktop connection timed out. Try reconnecting.");
          client?.disconnect();
        }, 30_000);
      }).catch((cause) => { if (active) setError((cause as Error).message); });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(timeout);
      client?.disconnect();
    };
  }, [machine.id, machine.workspaceId, machine.status, retry]);
  return <div className="relative h-full min-h-0 bg-[#111]">
    <div ref={target} aria-label={machine.name + " live desktop"} className="h-full w-full" />
    {machine.status === "running" && !connected && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111] p-5 text-center text-xs text-zinc-400">
      {error ? <p role="alert">{error}</p> : <p role="status">Connecting to desktop…</p>}
      <Button size="xs" variant="ghost" onClick={() => setRetry((value) => value + 1)}>Reconnect</Button>
    </div>}
    {connected && <Button size="xs" variant="ghost" className="absolute bottom-2 right-2 bg-[#222]/90" onClick={() => setRetry((value) => value + 1)}>Reconnect</Button>}
  </div>;
}
