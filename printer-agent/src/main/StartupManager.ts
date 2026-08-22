import { app } from "electron";

export class StartupManager {
  enable(): void {
    if (!app.isPackaged) return;
    app.setLoginItemSettings({ openAtLogin: true, path: process.execPath });
  }
}
