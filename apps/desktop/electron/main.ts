import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { IPC_CHANNELS, type NativeFeature } from "@orbit/shared";

const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

function registerIpcFoundation() {
  ipcMain.handle(IPC_CHANNELS.runtimeInfo, () => ({
    platform: process.platform,
    version: app.getVersion(),
  }));

  ipcMain.handle(
    IPC_CHANNELS.featureRequest,
    (_event, feature: NativeFeature) => ({
      available: false as const,
      message: `${feature} integration is reserved for a future Orbit milestone.`,
    }),
  );
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1560,
    height: 1000,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: process.platform === "darwin" ? "#00000000" : "#101112",
    transparent: process.platform === "darwin",
    vibrancy: process.platform === "darwin" ? "under-window" : undefined,
    visualEffectState: process.platform === "darwin" ? "active" : undefined,
    hasShadow: true,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 15, y: 14 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => window.show());

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcFoundation();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
