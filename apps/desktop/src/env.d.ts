/// <reference types="vite/client" />

import type { OrbitDesktopAPI } from "@orbit/shared";

declare global {
  interface Window {
    orbitDesktop?: OrbitDesktopAPI;
  }
}

export {};
