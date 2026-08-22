import type { PrinterInfo } from "./PrinterDiscovery.js";
import type { PrintResult, PrinterTransport } from "./PrinterTransport.js";

export class WindowsPrinterTransport implements PrinterTransport {
  discover(): PrinterInfo[] {
    try {
      const printer = this.loadPrinterModule();
      const nativePrinters = typeof printer?.getPrinters === "function" ? printer.getPrinters() : [];
      return Array.isArray(nativePrinters) ? nativePrinters.map((item) => ({
        id: item.id || item.name || "",
        name: item.name || "Unknown Printer",
        status: item.status || "unknown",
        isDefault: Boolean(item.isDefault),
        driver: "Windows",
        capabilities: {
          rawEscPos: "unknown" as const,
          qr: "unknown" as const,
          barcode: "unknown" as const,
          cut: "unknown" as const,
        },
        identifierSource: item.id ? "native" as const : "printer-name" as const,
      })) : [];
    } catch {
      return [];
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
}
