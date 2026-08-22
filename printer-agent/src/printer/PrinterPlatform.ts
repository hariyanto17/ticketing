export interface PrinterPlatformCapabilities {
  platform: NodeJS.Platform;
  canDiscoverPrinters: boolean;
  canRawPrint: boolean;
  canAutoCut: boolean;
  hardwarePrintingSupported: boolean;
  backend: string;
}

export function getPrinterPlatformCapabilities(platform: NodeJS.Platform = process.platform): PrinterPlatformCapabilities {
  const windows = platform === "win32";

  return {
    platform,
    canDiscoverPrinters: windows,
    canRawPrint: windows,
    canAutoCut: windows,
    hardwarePrintingSupported: windows,
    backend: windows ? "windows-native" : "unsupported",
  };
}
