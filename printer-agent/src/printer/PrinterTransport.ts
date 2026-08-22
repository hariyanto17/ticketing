import type { PrinterInfo } from "./PrinterDiscovery.js";

export interface PrintResult {
  jobId?: string;
}

export interface PrinterTransport {
  discover(): PrinterInfo[];
  print(printer: PrinterInfo, data: Buffer, jobId: string): Promise<PrintResult>;
  close(): void;
}
