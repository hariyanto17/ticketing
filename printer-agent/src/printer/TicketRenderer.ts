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
    const parts: Buffer[] = [Buffer.from([ESC, 0x40, GS, 0x4c, LEFT_MARGIN_DOTS, 0x00, ESC, 0x61, 0x00])];

    parts.push(Buffer.from([ESC, 0x45, 0x01, GS, 0x21, 0x11]));
    parts.push(this.renderLine(payload.movie || "PLANET CINEMA", width, true));
    parts.push(Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00]));

    for (const line of this.renderLines(payload, width)) {
      parts.push(this.renderLine(line, width));
    }

    parts.push(this.renderLine("-".repeat(width - LEFT_MARGIN_COLUMNS), width));

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
      `tanggal tayang : ${formatDate(payload.showDate)}`,
      `jam tayang : ${payload.showTime || "-"}`,
      `harga : Rp ${formattedPrice}`,
      "",
      `row: ${payload.row || payload.seat?.charAt(0) || "-"} seat ${payload.seatNumber ?? (payload.seat?.slice(1) || "-")} studio ${payload.studio || "-"}`,
    ];
  }

  private renderLine(line: string, width: number, centered = false): Buffer {
    const contentWidth = width - LEFT_MARGIN_COLUMNS;
    const content = line.slice(0, contentWidth);
    const padded = centered ? content.padStart(Math.floor((contentWidth + content.length) / 2)).padEnd(contentWidth, " ") : content.padEnd(contentWidth, " ");
    return Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${padded}\n`, "utf8");
  }

}

function formatDate(value?: string): string {
  if (!value) return "-";
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
