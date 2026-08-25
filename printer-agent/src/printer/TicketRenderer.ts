import QRCode from "qrcode-generator";
import type { TicketPrintPayload } from "./PrinterService.js";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const LEFT_MARGIN_DOTS = 24;
const LEFT_MARGIN_COLUMNS = 3;

export interface TicketRenderOptions {
  paperWidth: 58 | 80;
  autoCut: boolean;
}

export class TicketRenderer {
  render(payload: TicketPrintPayload, options: TicketRenderOptions): Buffer {
    const width = options.paperWidth === 58 ? 32 : 42;
    const lines = this.renderLines(payload, width);
    const parts: Buffer[] = [Buffer.from([ESC, 0x40, GS, 0x4c, LEFT_MARGIN_DOTS, 0x00, ESC, 0x61, 0x00, ESC, 0x45, 0x01])];

    for (const line of lines) {
      const contentWidth = width - LEFT_MARGIN_COLUMNS;
      parts.push(Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${line.slice(0, contentWidth).padEnd(contentWidth, " ")}\n`, "utf8"));
    }

    if (payload.qrCode) {
      parts.push(Buffer.from(" ".repeat(LEFT_MARGIN_COLUMNS), "utf8"));
      parts.push(this.renderQr(payload.qrCode));
    }

    parts.push(Buffer.from([ESC, 0x45, 0x00, ESC, 0x64, 0x03, LF]));
    if (options.autoCut) {
      parts.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    }

    return Buffer.concat(parts);
  }

  private renderLines(payload: TicketPrintPayload, width: number): string[] {
    const price = payload.price ?? payload.totalAmount ?? 0;
    const formattedPrice = new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(price);

    return [
      "=".repeat(width),
      "PLANET CINEMA".padStart(Math.floor((width + 14) / 2)).padEnd(width),
      "=".repeat(width),
      "",
      (payload.movie || "PLANET CINEMA").slice(0, width),
      "",
      `Studio: ${payload.studio || "-"}`,
      `${payload.showDate || "-"} ${payload.showTime || "-"}`,
      "",
      `Seat: ${payload.seat || "-"}`,
      `Ticket: ${payload.ticketNumber || "-"}`,
      `Order: ${payload.orderNumber || "-"}`,
      `Price: Rp ${formattedPrice}`,
      "",
      "Please keep this ticket for entry validation.",
      "=".repeat(width),
    ];
  }

  private renderQr(data: string): Buffer {
    const qr = QRCode(0, "M");
    qr.addData(data);
    qr.make();

    const content = Buffer.from(data, "utf8");
    const storeLength = content.length + 3;
    const store = Buffer.from([GS, 0x28, 0x6b, storeLength & 0xff, (storeLength >> 8) & 0xff, 0x31, 0x50, 0x30]);
    const size = Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06]);
    const errorCorrection = Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31]);
    const print = Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

    return Buffer.concat([store, content, size, errorCorrection, print]);
  }
}
