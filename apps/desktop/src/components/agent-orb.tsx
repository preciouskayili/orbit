import { useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";

export type AgentPhase =
  "idle" | "working" | "searching" | "composing" | "waiting";

// Keep the vendor component behind one small adapter for the future agent stream.
export function AgentOrb({
  phase = "idle",
  size = 20,
}: {
  phase?: AgentPhase;
  size?: 20 | 64;
}) {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const moving = ["working", "searching", "composing"].includes(phase);
  return (
    <span
      aria-hidden="true"
      data-orb-phase={phase}
      className="inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <ThinkingOrb
        state={
          moving
            ? (phase as "working" | "searching" | "composing")
            : "breathing"
        }
        size={size}
        theme="dark"
        paused={reducedMotion || !moving}
      />
    </span>
  );
}
