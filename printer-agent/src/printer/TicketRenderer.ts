import QRCode from "qrcode-generator";
import type { TicketPrintPayload } from "./PrinterService.js";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

export interface TicketRenderOptions {
  paperWidth: 58 | 80;
  autoCut: boolean;
}

export class TicketRenderer {
  render(payload: TicketPrintPayload, options: TicketRenderOptions): Buffer {
    const width = options.paperWidth === 58 ? 32 : 42;
    const parts: Buffer[] = [Buffer.from([ESC, 0x40, ESC, 0x61, 0x00, ESC, 0x45, 0x01])];

    // 1. Customer Copy (Full Ticket)
    const customerLines = this.renderCustomerLines(payload, width);
    for (const line of customerLines) {
      parts.push(Buffer.from(`${this.formatLine(line, width)}\n`, "utf8"));
    }

    // Customer QR Code (only on first copy)
    if (payload.qrCode) {
      parts.push(this.renderQr(payload.qrCode));
    }

    // 2. Cut Here Separator
    const separatorLine = this.renderCutSeparator(width);
    parts.push(Buffer.from(`\n${this.formatLine(separatorLine, width)}\n\n`, "utf8"));

    // 3. Staff Copy (Compact Slip)
    const staffLines = this.renderStaffLines(payload, width);
    for (const line of staffLines) {
      parts.push(Buffer.from(`${this.formatLine(line, width)}\n`, "utf8"));
    }

    // Finalize
    parts.push(Buffer.from([ESC, 0x45, 0x00, ESC, 0x64, 0x03, LF]));
    if (options.autoCut) {
      parts.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    }

    return Buffer.concat(parts);
  }

  private renderCustomerLines(payload: TicketPrintPayload, width: number): string[] {
    const formattedPrice = this.formatPrice(payload.price, payload.totalAmount);
    const movieTitle = (payload.movie || "PLANET CINEMA").toUpperCase();
    const movieLines = this.wrapText(movieTitle, width);

    const lines: string[] = [
      "=".repeat(width),
      this.centerText("Planet Cinema", width),
      this.centerText("Bone", width),
      "=".repeat(width),
      "",
      ...movieLines,
      "",
      `SHOW DATE : ${payload.showDate || "-"}`,
      `SHOW TIME : ${payload.showTime || "-"}`,
      `Price     : ${formattedPrice}`,
      "",
      `Studio: ${payload.studio || "-"}   Seat: ${payload.seat || "-"}`,
      `Ticket: ${payload.ticketNumber || "-"}`,
    ];

    if (payload.orderNumber) {
      lines.push(`Order : ${payload.orderNumber}`);
    }

    lines.push(
      "",
      "Please keep this ticket for entry.",
      "=".repeat(width)
    );

    return lines;
  }

  private renderStaffLines(payload: TicketPrintPayload, width: number): string[] {
    const formattedPrice = this.formatPrice(payload.price, payload.totalAmount);
    const movieTitle = (payload.movie || "PLANET CINEMA").toUpperCase();
    const movieLines = this.wrapText(movieTitle, width);

    const lines: string[] = [
      "Planet Cinema - Bone",
      ...movieLines,
      `${payload.showDate || "-"}  ${payload.showTime || "-"}`,
    ];

    const studioSeatPrice = `Studio: ${payload.studio || "-"}  Seat: ${payload.seat || "-"}  Price: ${formattedPrice}`;
    if (studioSeatPrice.length <= width) {
      lines.push(studioSeatPrice);
    } else {
      lines.push(`Studio: ${payload.studio || "-"}  Seat: ${payload.seat || "-"}`);
      lines.push(`Price: ${formattedPrice}`);
    }

    lines.push(`Ticket: ${payload.ticketNumber || "-"}`);
    lines.push("-".repeat(width));

    return lines;
  }

  private renderCutSeparator(width: number): string {
    const label = " CUT HERE ";
    const dashes = Math.max(0, width - label.length);
    const left = Math.floor(dashes / 2);
    const right = dashes - left;
    return `${"-".repeat(left)}${label}${"-".repeat(right)}`;
  }

  private formatLine(line: string, width: number): string {
    return line.slice(0, width).padEnd(width, " ");
  }

  private formatPrice(price?: number, totalAmount?: number): string {
    const amount = price ?? totalAmount ?? 0;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(amount);
  }

  private centerText(text: string, width: number): string {
    const trimmed = text.trim();
    if (trimmed.length >= width) return trimmed.slice(0, width);
    const totalPadding = width - trimmed.length;
    const leftPadding = Math.floor(totalPadding / 2);
    return " ".repeat(leftPadding) + trimmed;
  }

  private wrapText(text: string, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (!word) continue;
      if (word.length > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = "";
        }
        let remaining = word;
        while (remaining.length > maxWidth) {
          lines.push(remaining.slice(0, maxWidth));
          remaining = remaining.slice(maxWidth);
        }
        currentLine = remaining;
      } else if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxWidth) {
        currentLine += ` ${word}`;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
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

