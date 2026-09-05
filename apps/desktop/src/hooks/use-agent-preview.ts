import { useEffect, useState } from "react";
import { orbitActions, type Task } from "@/lib/orbit-store";
import type { AgentPhase } from "@/components/agent-orb";

// Deliberately opt-in. This walks through local demo events, never real tools.
// Timers are disposed on navigation, handoff, pause, and unmount.
export function useAgentPreview(
  conversation: Task | undefined,
  onError: (message: string) => void,
) {
  const [playingId, setPlayingId] = useState<string>();
  const playing = Boolean(
    conversation &&
    conversation.id === playingId &&
    conversation.status === "running",
  );
  useEffect(() => {
    setPlayingId(undefined);
  }, [conversation?.id]);
  useEffect(() => {
    if (!playing || !conversation) return;
    const timer = window.setTimeout(() => {
      try {
        orbitActions.taskAction(conversation.id, "advance");
      } catch (error) {
        setPlayingId(undefined);
        onError((error as Error).message);
      }
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [
    playing,
    conversation?.id,
    conversation?.step,
    conversation?.status,
    onError,
  ]);
  function start() {
    if (!conversation) return;
    try {
      if (conversation.status === "paused")
        orbitActions.taskAction(conversation.id, "resume");
      setPlayingId(conversation.id);
    } catch (error) {
      onError((error as Error).message);
    }
  }
  function pause() {
    if (!conversation) return;
    setPlayingId(undefined);
    try {
      orbitActions.taskAction(conversation.id, "pause");
    } catch (error) {
      onError((error as Error).message);
    }
  }
  const phase: AgentPhase = playing
    ? conversation!.step === 0
      ? "working"
      : conversation!.step === 1
        ? "searching"
        : "composing"
    : conversation?.requests.some((r) => r.status === "pending") ||
        conversation?.status === "review"
      ? "waiting"
      : "idle";
  return { playing, phase, start, pause };
}
