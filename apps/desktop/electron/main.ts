import { app, BrowserWindow, ipcMain, shell } from "electron";
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

const appIconPath = () =>
  path.join(app.getAppPath(), "resources/icons/orbit.png");

function createWindow() {
  const window = new BrowserWindow({
    icon: appIconPath(),
    width: 1560,
    height: 1000,
    minWidth: 1120,
    minHeight: 720,
    backgroundColor: process.platform === "darwin" ? "#00000000" : "#101112",
    transparent: process.platform === "darwin",
    // macOS renders the real desktop blur below our transparent web content.
    // The opaque workspace covers it; the translucent sidebar lets it show.
    vibrancy: process.platform === "darwin" ? "sidebar" : undefined,
    visualEffectState:
      process.platform === "darwin" ? "followWindow" : undefined,
    hasShadow: true,
    roundedCorners: true,
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

  // Agent Markdown links belong in the user's browser, never a privileged
  // Electron child window. Only ordinary web URLs may leave the application.
  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      if (["https:", "http:"].includes(new URL(url).protocol)) {
        void shell.openExternal(url).catch(() => {});
      }
    } catch {
      /* Ignore malformed external links. */
    }
    return { action: "deny" };
  });

  window.once("ready-to-show", () => window.show());

  if (isDevelopment && process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock?.setIcon(appIconPath());
  registerIpcFoundation();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
