const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 18765;

export interface PrinterAgentPrinter {
  id: string;
  name: string;
  status: "ready" | "offline" | "busy" | "unknown";
  isDefault: boolean;
  driver: string;
  capabilities: Record<string, boolean | "unknown">;
  identifierSource: "native" | "printer-name";
}

export interface PrinterAgentConfig {
  ticketPrinterId: string | null;
  ticketPrinter: string | null;
  paperWidth: 58 | 80;
  autoCut: boolean;
}

export interface PrinterAgentHealth {
  status: "ok" | "error";
  version: string;
  platform: string;
  backend: string;
  hardwarePrintingSupported: boolean;
  canDiscoverPrinters: boolean;
  canRawPrint: boolean;
  canAutoCut: boolean;
}

export class PrinterAgentClient {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(token?: string, baseUrl?: string) {
    this.token = token || (typeof window !== "undefined" ? localStorage.getItem("printerAgentToken") || "" : "");
    this.baseUrl = baseUrl || `http://${DEFAULT_HOST}:${DEFAULT_PORT}`;
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Printer-Agent-Token": this.token,
    };
  }

  async getHealth(): Promise<PrinterAgentHealth> {
    const response = await fetch(`${this.baseUrl}/api/health`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Printer agent unavailable");
    return response.json();
  }

  async getPrinters(): Promise<PrinterAgentPrinter[]> {
    const response = await fetch(`${this.baseUrl}/api/printers`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Unable to fetch printers");
    const payload = await response.json();
    return payload.printers || [];
  }

  async getConfig(): Promise<PrinterAgentConfig> {
    const response = await fetch(`${this.baseUrl}/api/config`, { headers: this.getHeaders() });
    if (!response.ok) throw new Error("Unable to fetch config");
    return response.json();
  }

  async updateConfig(config: Partial<PrinterAgentConfig>): Promise<PrinterAgentConfig> {
    const response = await fetch(`${this.baseUrl}/api/config`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || "Unable to save config");
    }
    return response.json();
  }

  async testPrint(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/printers/test`, {
      method: "POST",
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || "Print test failed");
    }
    return response.json();
  }

  async printTicket(payload: Record<string, unknown>): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${this.baseUrl}/api/print/ticket`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error?.error?.message || "Ticket print failed");
    }
    return response.json();
  }
}

export const createPrinterAgentClient = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("printerAgentToken") || "" : "";
  return new PrinterAgentClient(token);
};
