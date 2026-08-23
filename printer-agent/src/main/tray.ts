import { Tray, Menu, app, nativeImage, shell } from "electron";

export class PrinterTray {
  private tray: Tray | null = null;
  constructor() {
    this.tray = new Tray(nativeImage.createEmpty());
    const contextMenu = Menu.buildFromTemplate([
      { label: "Planet Cinema Printer Agent", enabled: false },
      { label: "Running", enabled: false },
      { type: "separator" },
      { label: "Open Cinema Printer Settings", click: () => this.openSetup() },
      { type: "separator" },
      { label: "Exit", click: () => app.exit() },
    ]);

    this.tray.setToolTip("Planet Cinema Printer Agent");
    this.tray.setContextMenu(contextMenu);
  }

  private openSetup() {
    void shell.openExternal(process.env.CINEMA_PRINTER_SETTINGS_URL || "https://ticketing-fe.168billiard.online/printer-settings");
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}
