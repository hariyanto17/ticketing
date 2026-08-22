import { app } from "electron";
import { ConfigService } from "../config/ConfigService.js";
import { PrinterAgentServer } from "../server/server.js";
import { PrinterTray } from "./tray.js";
import { StartupManager } from "./StartupManager.js";

const configService = new ConfigService();
const settings = configService.getSettings();
let server: PrinterAgentServer | undefined;
let tray: PrinterTray | undefined;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("ready", async () => {
  server = new PrinterAgentServer(configService);
  try {
    await server.start(settings.port, settings.host);
    console.log(`Printer agent listening on http://${settings.host}:${settings.port}`);
    tray = new PrinterTray();
    new StartupManager().enable();
  } catch (error) {
    console.error("Failed to start printer agent", error);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  // The agent is intentionally a background tray process.
});

app.on("before-quit", () => {
  tray?.destroy();
  void server?.close();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void server?.close().finally(() => app.quit());
  });
}
