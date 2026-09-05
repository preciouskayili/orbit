import { useEffect, useRef } from "react";
import { orbitActions } from "@/lib/orbit-store";

export const INPUT_IDLE_MS = 1800;

// Pointer/keyboard input yields the shared desktop to the person automatically.
// A focused editor retains the lease; idle non-editing input releases it.
export function useDesktopInteraction(
  machineId: string,
  running: boolean,
  onError: (message: string) => void,
) {
  const root = useRef<HTMLDivElement>(null);
  const pointerHeld = useRef(false);
  const token = useRef<string | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  function release() {
    if (timer.current) clearTimeout(timer.current);
    if (token.current) orbitActions.endInteraction(machineId, token.current);
    token.current = undefined;
  }
  function deferRelease() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (pointerHeld.current) return;
      const focused = document.activeElement;
      if (
        root.current?.contains(focused) &&
        focused?.matches("input, textarea, [contenteditable=true]")
      )
        return;
      release();
    }, INPUT_IDLE_MS);
  }
  function interact() {
    if (!running) return;
    try {
      token.current ??= orbitActions.beginInteraction(machineId);
      deferRelease();
    } catch (error) {
      onError((error as Error).message);
    }
  }
  useEffect(() => {
    const pointerUp = () => {
      if (pointerHeld.current) {
        pointerHeld.current = false;
        deferRelease();
      }
    };
    const blur = () => {
      pointerHeld.current = false;
      release();
    };
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerUp);
      window.removeEventListener("blur", blur);
      release();
    };
  }, [machineId]);
  useEffect(() => {
    if (!running) release();
  }, [running]);
  return {
    ref: root,
    onPointerDownCapture: () => {
      pointerHeld.current = true;
      interact();
    },
    onWheelCapture: interact,
    onKeyDownCapture: interact,
    onFocusCapture: interact,
    onBlurCapture: deferRelease,
    onInputCapture: interact,
  };
}
