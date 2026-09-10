import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type OrbitDesktopAPI } from '@orbit/shared';
const desktopAPI: OrbitDesktopAPI = {
  getRuntimeInfo: () => ipcRenderer.invoke(IPC_CHANNELS.runtimeInfo),
  getApiConnection: () => ipcRenderer.invoke(IPC_CHANNELS.apiConnection),
};
contextBridge.exposeInMainWorld('orbitDesktop', desktopAPI);
