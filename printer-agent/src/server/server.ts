import express, { type Request, type Response, NextFunction } from "express";
import cors from "cors";
import { ConfigService } from "../config/ConfigService.js";
import { AuthService } from "../security/AuthService.js";
import { createPrinterService, type EscPosPrinterService } from "../printer/EscPosPrinterService.js";
import type { TicketPrintPayload } from "../printer/PrinterService.js";

export class PrinterAgentServer {
  private readonly app = express();
  private readonly configService: ConfigService;
  private readonly authService: AuthService;
  private readonly printerService: EscPosPrinterService;
  private httpServer?: ReturnType<typeof this.app.listen>;

  constructor(configService: ConfigService) {
    this.configService = configService;
    this.authService = new AuthService(configService.getToken());

    this.printerService = createPrinterService(configService.getConfig());

    this.app.use(express.json({ limit: "1mb" }));
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowed = this.configService.getSettings().corsOrigins;
        if (!origin || allowed.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "OPTIONS"],
      allowedHeaders: ["Content-Type", "X-Printer-Agent-Token"],
    }));

    this.app.use((req, res, next) => {
      const token = req.headers["x-printer-agent-token"]?.toString();
      if (!this.authService.validate(token)) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing printer token." } });
      }
      next();
    });

    this.app.get("/api/health", (req, res) => {
      const capabilities = this.printerService.getCapabilities();
      res.json({ status: "ok", version: "1.0.0", ...capabilities, printerBackend: capabilities.backend });
    });

    this.app.get("/api/printers", async (req, res) => {
      const printers = await this.printerService.listPrinters();
      res.json({ printers });
    });

    this.app.get("/api/config", (req, res) => {
      res.json(this.configService.getConfig());
    });

    this.app.put("/api/config", async (req, res) => {
      const { ticketPrinterId, ticketPrinter, paperWidth, autoCut } = req.body || {};
      if (ticketPrinterId !== undefined && typeof ticketPrinterId !== "string" && ticketPrinterId !== null) {
        return res.status(400).json({ error: { code: "INVALID_CONFIG", message: "ticketPrinterId must be a string or null." } });
      }
      if (typeof ticketPrinter !== "string" && ticketPrinter !== null) {
        return res.status(400).json({ error: { code: "INVALID_CONFIG", message: "ticketPrinter must be a string or null." } });
      }
      if (paperWidth && ![58, 80].includes(Number(paperWidth))) {
        return res.status(400).json({ error: { code: "INVALID_CONFIG", message: "paperWidth must be 58 or 80." } });
      }

      const normalizedPaperWidth = Number(paperWidth);
      const nextConfig = await this.configService.updateConfig({
        ticketPrinterId: ticketPrinterId ?? ticketPrinter ?? null,
        ticketPrinter: ticketPrinter ?? null,
        paperWidth: normalizedPaperWidth === 58 || normalizedPaperWidth === 80 ? normalizedPaperWidth : 80,
        autoCut: Boolean(autoCut),
      });

      this.printerService.updateConfig(nextConfig);
      res.json(nextConfig);
    });

    this.app.post("/api/printers/test", async (req, res) => {
      try {
        const result = await this.printerService.printTest();
        if (result.status === "failed") {
          const code = result.error || "PRINT_ERROR";
          return res.status(code === "HARDWARE_PRINTING_UNSUPPORTED" ? 501 : 409).json({ error: { code, message: code } });
        }
        res.json({ ...result, message: "Test print completed." });
      } catch (error: any) {
        res.status(500).json({ error: { code: "PRINT_ERROR", message: error.message || "Failed to print test page." } });
      }
    });

    this.app.post("/api/print/ticket", async (req, res) => {
      const payload = req.body || {};
      const valid = this.validateTicketPayload(payload);
      if (!valid.ok) {
        return res.status(400).json({ error: { code: valid.code, message: valid.message } });
      }

      try {
        const result = await this.printerService.printTicket(payload as TicketPrintPayload);
        if (result.status === "failed") {
          const code = result.error || "PRINT_ERROR";
          return res.status(code === "HARDWARE_PRINTING_UNSUPPORTED" ? 501 : 409).json({ error: { code, message: code } });
        }

        res.json({ jobId: result.jobId, status: result.status });
      } catch (error: any) {
        res.status(500).json({ error: { code: "PRINT_ERROR", message: error.message || "Print failed." } });
      }
    });

    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      if (error?.message === "Origin not allowed") {
        return res.status(403).json({ error: { code: "CORS_FORBIDDEN", message: "Origin not allowed." } });
      }
      return next(error);
    });
  }

  private validateTicketPayload(payload: any): { ok: boolean; code?: string; message?: string } {
    if (!payload || typeof payload !== "object") {
      return { ok: false, code: "INVALID_PAYLOAD", message: "Payload must be an object." };
    }

    if (payload.mode !== undefined && payload.mode !== "print" && payload.mode !== "reprint") {
      return { ok: false, code: "INVALID_PAYLOAD", message: "mode must be print or reprint." };
    }
    const stringFields = ["jobId", "ticketNumber", "orderNumber", "movie", "studio", "showDate", "showTime", "seat", "qrCode"];
    for (const field of stringFields) {
      if (payload[field] !== undefined && typeof payload[field] !== "string") {
        return { ok: false, code: "INVALID_PAYLOAD", message: `${field} must be a string when provided.` };
      }
    }
    if (!payload.ticketNumber && !payload.orderNumber) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "ticketNumber or orderNumber is required." };
    }
    if (payload.price !== undefined && (typeof payload.price !== "number" || !Number.isFinite(payload.price) || payload.price < 0)) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "price must be a non-negative number when provided." };
    }
    if (payload.totalAmount !== undefined && (typeof payload.totalAmount !== "number" || !Number.isFinite(payload.totalAmount) || payload.totalAmount < 0)) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "totalAmount must be a non-negative number when provided." };
    }

    return { ok: true };
  }

  start(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
        this.httpServer = this.app.listen(port, host, () => {
        resolve();
      });
        this.httpServer.on("error", (error) => reject(error));
    });
  }

    async close(): Promise<void> {
      await this.printerService.close();
      if (!this.httpServer) return;
      await new Promise<void>((resolve, reject) => this.httpServer?.close((error) => error ? reject(error) : resolve()));
    }

  getExpressApp() {
    return this.app;
  }
}
