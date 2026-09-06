import { Tray, Menu, app, nativeImage, shell } from "electron";

export class PrinterTray {
  private tray: Tray | null = null;
  constructor(private readonly deviceId: string) {
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
    const setupUrl = process.env.CINEMA_PRINTER_SETTINGS_URL || "https://ticket.168billiard.online/printer-settings";
    const separator = setupUrl.includes("#") ? "&" : "#";
    void shell.openExternal(`${setupUrl}${separator}printer-agent-device-id=${encodeURIComponent(this.deviceId)}`);
  }

  destroy() {
    this.tray?.destroy();
    this.tray = null;
  }
}
