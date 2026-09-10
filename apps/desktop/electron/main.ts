import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { app, BrowserWindow, ipcMain, shell, utilityProcess } from "electron";
import path from "node:path";
import { IPC_CHANNELS } from "@orbit/shared";

if (process.env.ORBIT_DATA_HOME) {
  const dataHome = path.resolve(process.env.ORBIT_DATA_HOME); mkdirSync(dataHome, { recursive: true }); app.setPath('userData', dataHome);
}
const primaryInstance = !app.isPackaged || app.requestSingleInstanceLock();
if (!primaryInstance) app.quit();
app.on('second-instance', () => { const window = BrowserWindow.getAllWindows()[0]; if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
let apiProcess: ReturnType<typeof utilityProcess.fork> | undefined;
let apiReady: Promise<{ url: string; token: string } | undefined> = Promise.resolve(undefined);
async function startLocalApi() {
  const port = await new Promise<number>((resolve, reject) => { const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const port = (server.address() as {port:number}).port; server.close(() => resolve(port)); }); });
  const token = randomBytes(32).toString('hex');
  const directory = path.join(app.getPath('userData'), 'api'); mkdirSync(directory, { recursive: true, mode: 0o700 });
  apiProcess = utilityProcess.fork(path.join(process.resourcesPath, 'api/server.cjs'), [], { cwd: directory, env: { ...process.env, API_PORT: String(port), ORBIT_API_TOKEN: token, ORBIT_DATA_DIR: directory, ORBIT_WORKSPACE_ID: 'personal' }, stdio: 'ignore' });
  apiProcess.on('exit', () => { apiProcess = undefined; });
  const url = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { if ((await fetch(url + '/health', { signal: AbortSignal.timeout(500) })).ok) return { url, token }; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('The local API did not start.');
}
app.on('before-quit', () => apiProcess?.kill());
const isDevelopment = Boolean(process.env.VITE_DEV_SERVER_URL);

function registerIpcFoundation() {
  ipcMain.handle(IPC_CHANNELS.runtimeInfo, () => ({
    platform: process.platform,
    version: app.getVersion(),
  }));

  ipcMain.handle(IPC_CHANNELS.apiConnection, () => apiReady);

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
  window.webContents.on("will-navigate", event => event.preventDefault());
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
  if (!primaryInstance) return;
  if (process.platform === "darwin") app.dock?.setIcon(appIconPath());
  if (app.isPackaged) apiReady = startLocalApi();
  registerIpcFoundation();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
