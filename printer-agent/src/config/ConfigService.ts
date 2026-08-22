import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface PrinterConfig {
  ticketPrinterId: string | null;
  ticketPrinter: string | null;
  paperWidth: 58 | 80;
  autoCut: boolean;
}

export interface PrinterAgentSettings {
  host: string;
  port: number;
  corsOrigins: string[];
}

const defaultConfig: PrinterConfig = {
  ticketPrinterId: null,
  ticketPrinter: null,
  paperWidth: 80,
  autoCut: true,
};

const defaultSettings: PrinterAgentSettings = {
  host: "127.0.0.1",
  port: 18765,
  corsOrigins: ["http://localhost:3000", "http://127.0.0.1:3000"],
};

export class ConfigService {
  private readonly appDataDir: string;
  private readonly configPath: string;
  private readonly tokenPath: string;
  private config: PrinterConfig;
  private token: string;

  constructor() {
    const appName = "PlanetCinemaPrinterAgent";
    const platformAppData = process.env.PRINTER_AGENT_DATA_DIR || process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    this.appDataDir = path.join(platformAppData, appName);
    this.configPath = path.join(this.appDataDir, "printer-config.json");
    this.tokenPath = path.join(this.appDataDir, "printer-token.txt");

    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }

    this.config = this.readConfig();
    this.token = this.readToken();
  }

  private readConfig(): PrinterConfig {
    try {
      if (!fs.existsSync(this.configPath)) return { ...defaultConfig };
      const raw = fs.readFileSync(this.configPath, "utf8");
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed, ticketPrinterId: parsed.ticketPrinterId ?? parsed.ticketPrinter ?? null };
    } catch {
      return { ...defaultConfig };
    }
  }

  private readToken(): string {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const existing = fs.readFileSync(this.tokenPath, "utf8").trim();
        if (existing) return existing;
      }
    } catch {
      // no-op
    }

    const generated = `pcpa_${Math.random().toString(36).slice(2, 12)}_${Date.now().toString(36)}`;
    fs.writeFileSync(this.tokenPath, generated, { mode: 0o600 });
    return generated;
  }

  getConfig(): PrinterConfig {
    return { ...this.config };
  }

  async updateConfig(next: Partial<PrinterConfig>): Promise<PrinterConfig> {
    this.config = {
      ...this.config,
      ...next,
      ticketPrinterId: next.ticketPrinterId !== undefined ? next.ticketPrinterId : this.config.ticketPrinterId,
      paperWidth: next.paperWidth === 58 || next.paperWidth === 80 ? next.paperWidth : 80,
    };

    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    return { ...this.config };
  }

  getToken(): string {
    return this.token;
  }

  getSettings(): PrinterAgentSettings {
    const envHost = process.env.PRINTER_AGENT_HOST || defaultSettings.host;
    const envPort = process.env.PRINTER_AGENT_PORT ? Number(process.env.PRINTER_AGENT_PORT) : defaultSettings.port;
    const envOrigins = process.env.PRINTER_AGENT_ALLOWED_ORIGINS?.split(",").map((value) => value.trim()).filter(Boolean) || defaultSettings.corsOrigins;

    return {
      host: envHost,
      port: Number.isFinite(envPort) ? envPort : defaultSettings.port,
      corsOrigins: envOrigins,
    };
  }
}
