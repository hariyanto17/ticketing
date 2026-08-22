import type { PrinterInfo } from "./PrinterDiscovery.js";
import type { PrintResult, PrinterTransport } from "./PrinterTransport.js";

export class UnsupportedPrinterTransport implements PrinterTransport {
  discover(): PrinterInfo[] {
    return [];
  }

  async print(_printer: PrinterInfo, _data: Buffer, _jobId: string): Promise<PrintResult> {
    throw new Error("HARDWARE_PRINTING_UNSUPPORTED");
  }

  close(): void {}
}
