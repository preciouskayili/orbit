import { contextBridge, ipcRenderer } from "electron";
import {
  IPC_CHANNELS,
  type NativeFeature,
  type OrbitDesktopAPI,
} from "@orbit/shared";

const desktopAPI: OrbitDesktopAPI = {
  getRuntimeInfo: () => ipcRenderer.invoke(IPC_CHANNELS.runtimeInfo),
  requestFeature: (feature: NativeFeature) =>
    ipcRenderer.invoke(IPC_CHANNELS.featureRequest, feature),
};

contextBridge.exposeInMainWorld("orbitDesktop", desktopAPI);
