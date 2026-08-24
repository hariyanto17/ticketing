import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

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
  private config: PrinterConfig;

  constructor() {
    const appName = "PlanetCinemaPrinterAgent";
    const platformAppData = process.env.PRINTER_AGENT_DATA_DIR || process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    this.appDataDir = path.join(platformAppData, appName);
    this.configPath = path.join(this.appDataDir, "printer-config.json");

    if (!fs.existsSync(this.appDataDir)) {
      fs.mkdirSync(this.appDataDir, { recursive: true });
    }

    this.config = this.readConfig();
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

  getDeviceId(): string {
    const machineId = process.platform === "win32" ? this.readWindowsMachineId() : os.hostname();
    return crypto.createHash("sha256").update(`planet-cinema-printer-agent:${machineId}`).digest("hex");
  }

  private readWindowsMachineId(): string {
    try {
      return execFileSync("reg.exe", ["query", "HKLM\\SOFTWARE\\Microsoft\\Cryptography", "/v", "MachineGuid"], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 3000,
      }).match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i)?.[1].trim() || os.hostname();
    } catch {
      return os.hostname();
    }
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
