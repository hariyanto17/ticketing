import { execFileSync } from "node:child_process";
import type { PrinterInfo } from "./PrinterDiscovery.js";
import type { PrintResult, PrinterTransport } from "./PrinterTransport.js";

export class WindowsPrinterTransport implements PrinterTransport {
  discover(): PrinterInfo[] {
    try {
      const printer = this.loadPrinterModule();
      const nativePrinters = typeof printer?.getPrinters === "function" ? printer.getPrinters() : [];
      const discoveredPrinters = Array.isArray(nativePrinters) ? nativePrinters.map((item) => ({
        id: item.id || item.name || "",
        name: item.name || "Unknown Printer",
        status: normalizeStatus(item.status),
        isDefault: Boolean(item.isDefault),
        driver: item.driver || "Windows",
        capabilities: {
          rawEscPos: "unknown" as const,
          qr: "unknown" as const,
          barcode: "unknown" as const,
          cut: "unknown" as const,
        },
        identifierSource: item.id ? "native" as const : "printer-name" as const,
      })) : [];

      return discoveredPrinters.length > 0 ? discoveredPrinters : discoverWindowsQueues();
    } catch {
      return discoverWindowsQueues();
    }
  }

  async print(printer: PrinterInfo, data: Buffer, jobId: string): Promise<PrintResult> {
    const nativePrinter = this.loadPrinterModule();
    if (typeof nativePrinter?.printDirect !== "function") {
      throw new Error("HARDWARE_PRINTING_UNSUPPORTED");
    }

    await new Promise<void>((resolve, reject) => {
      const printDirect = nativePrinter.printDirect;
      if (typeof printDirect !== "function") {
        reject(new Error("HARDWARE_PRINTING_UNSUPPORTED"));
        return;
      }
      printDirect({
        data,
        printer: printer.name,
        docname: `Planet Cinema Ticket ${jobId}`,
        type: "RAW",
        success: () => resolve(),
        error: (error: Error | string) => reject(new Error(typeof error === "string" ? error : error.message)),
      });
    });

    return {};
  }

  close(): void {}

  private loadPrinterModule(): NativePrinterModule | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("printer") as NativePrinterModule;
    } catch {
      return null;
    }
  }
}

interface NativePrinterModule {
  getPrinters?: () => NativePrinterRecord[];
  printDirect?: (options: {
    data: Buffer;
    printer: string;
    docname: string;
    type: "RAW";
    success: (jobId?: unknown) => void;
    error: (error: Error | string) => void;
  }) => void;
}

interface NativePrinterRecord {
  id?: string;
  name?: string;
  status?: PrinterInfo["status"];
  isDefault?: boolean;
  driver?: string;
}

function normalizeStatus(status: unknown): PrinterInfo["status"] {
  return status === "ready" || status === "offline" || status === "busy" || status === "unknown" ? status : "unknown";
}

function discoverWindowsQueues(): PrinterInfo[] {
  try {
    const script = "Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PrinterStatus,WorkOffline,Default | ConvertTo-Json -Compress";
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    }).trim();

    if (!output) return [];
    const records = JSON.parse(output) as WindowsPrinterRecord | WindowsPrinterRecord[];
    const printers = Array.isArray(records) ? records : [records];
    return printers.filter((item) => item.Name).map((item) => ({
      id: item.Name!,
      name: item.Name!,
      status: item.WorkOffline ? "offline" : getWindowsStatus(item.PrinterStatus),
      isDefault: Boolean(item.Default),
      driver: item.DriverName || "Windows",
      capabilities: {
        rawEscPos: "unknown" as const,
        qr: "unknown" as const,
        barcode: "unknown" as const,
        cut: "unknown" as const,
      },
      identifierSource: "printer-name" as const,
    }));
  } catch {
    return [];
  }
}

function getWindowsStatus(status: unknown): PrinterInfo["status"] {
  if (status === 4 || status === 5 || status === 6) return "busy";
  if (status === 7 || status === 8 || status === 9 || status === 10 || status === 11) return "offline";
  if (status === 3) return "ready";
  return "unknown";
}

interface WindowsPrinterRecord {
  Name?: string;
  DriverName?: string;
  PrinterStatus?: number;
  WorkOffline?: boolean;
  Default?: boolean;
}
