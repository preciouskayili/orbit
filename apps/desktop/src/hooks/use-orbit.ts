import { useSyncExternalStore } from "react";
import { getOrbitState, subscribeOrbit } from "@/lib/orbit-store";
export function useOrbit() {
  return useSyncExternalStore(subscribeOrbit, getOrbitState, getOrbitState);
}
