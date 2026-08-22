import { PrintQueue, type PrintJobResult } from "./PrintQueue.js";
import type { PrinterInfo } from "./PrinterDiscovery.js";
import { getPrinterPlatformCapabilities, type PrinterPlatformCapabilities } from "./PrinterPlatform.js";
import { TicketRenderer } from "./TicketRenderer.js";
import type { TicketPrintPayload, PrinterService, PrintStatus } from "./PrinterService.js";
import type { PrinterTransport } from "./PrinterTransport.js";
import { WindowsPrinterTransport } from "./WindowsPrinterTransport.js";
import { UnsupportedPrinterTransport } from "./UnsupportedPrinterTransport.js";

export class EscPosPrinterService implements PrinterService {
  private readonly queue = new PrintQueue();
  private readonly renderer = new TicketRenderer();
  private config: { ticketPrinter: string | null; paperWidth: 58 | 80; autoCut: boolean };

  constructor(
    config: { ticketPrinter: string | null; paperWidth: 58 | 80; autoCut: boolean },
    private readonly transport: PrinterTransport,
    private readonly capabilities: PrinterPlatformCapabilities = getPrinterPlatformCapabilities(),
  ) {
    this.config = { ...config };
  }

  getCapabilities(): PrinterPlatformCapabilities {
    return this.capabilities;
  }

  updateConfig(config: { ticketPrinter: string | null; paperWidth: 58 | 80; autoCut: boolean }): void {
    this.config = { ...config };
  }

  async getStatus(): Promise<PrintStatus> {
    if (!this.capabilities.hardwarePrintingSupported || !this.config.ticketPrinter) return "offline";
    const selected = this.findSelectedPrinter();
    if (!selected) return "offline";
    return selected.status === "ready" ? "ready" : selected.status === "busy" ? "busy" : "error";
  }

  async listPrinters(): Promise<PrinterInfo[]> {
    return this.transport.discover();
  }

  async printTest(): Promise<PrintJobResult> {
    return this.printTicket({
      jobId: `test-${Date.now()}`,
      mode: "print",
      ticketNumber: "TEST-0001",
      orderNumber: "TEST-ORDER-0001",
      movie: "Planet Cinema Test Ticket",
      studio: "Studio 1",
      showDate: new Date().toISOString().slice(0, 10),
      showTime: "19:30",
      seat: "A1",
      price: 50000,
      qrCode: "https://example.com/test-ticket",
    });
  }

  async printTicket(payload: TicketPrintPayload): Promise<PrintJobResult> {
    const jobId = payload.jobId || `print-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (!this.capabilities.hardwarePrintingSupported) {
      return { jobId, status: "failed", error: "HARDWARE_PRINTING_UNSUPPORTED" };
    }

    const selected = this.findSelectedPrinter();
    if (!selected) return { jobId, status: "failed", error: "PRINTER_NOT_READY" };

    const data = this.renderer.render(payload, {
      paperWidth: this.config.paperWidth,
      autoCut: this.config.autoCut,
    });

    const result = await this.queue.enqueue(jobId, async () => {
      const started = Date.now();
      console.info(`[INFO] Print job queued jobId=${jobId} printer=${selected.name}`);
      await this.transport.print(selected, data, jobId);
      console.info(`[INFO] Print job completed jobId=${jobId} printer=${selected.name} duration=${Date.now() - started}ms`);
    });

    if (result.status === "failed") {
      console.error(`[ERROR] Print job failed jobId=${jobId} printer=${selected.name} error=${result.error || "unknown"}`);
    }
    return result;
  }

  async close(): Promise<void> {
    await this.queue.close();
    this.transport.close();
  }

  private findSelectedPrinter(): PrinterInfo | undefined {
    return this.transport.discover().find((printer) => printer.id === this.config.ticketPrinter || printer.name === this.config.ticketPrinter);
  }
}

export function createPrinterService(config: { ticketPrinter: string | null; paperWidth: 58 | 80; autoCut: boolean }): EscPosPrinterService {
  const capabilities = getPrinterPlatformCapabilities();
  const transport = capabilities.hardwarePrintingSupported
    ? new WindowsPrinterTransport()
    : new UnsupportedPrinterTransport();
  return new EscPosPrinterService(config, transport, capabilities);
}
