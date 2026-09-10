/// <reference types="vite/client" />

import type { OrbitDesktopAPI } from "@orbit/shared";

declare global {
  interface Window {
    orbitConnection?: { url: string; token: string };
    orbitDesktop?: OrbitDesktopAPI;
  }
}

export {};
