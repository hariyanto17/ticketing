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

    // Header: PLANET CINEMA (Hardware Center-aligned, Double size, Bold)
    parts.push(Buffer.from([ESC, 0x61, 0x01, ESC, 0x45, 0x01, GS, 0x21, 0x11]));
    parts.push(Buffer.from("PLANET CINEMA\n", "utf8"));
    parts.push(Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00, ESC, 0x61, 0x00]));

    // Movie Title below PLANET CINEMA (Left-aligned)
    if (payload.movie) {
      parts.push(Buffer.from([ESC, 0x45, 0x01]));
      parts.push(this.renderLine(payload.movie, width));
      parts.push(Buffer.from([ESC, 0x45, 0x00]));
    }

    for (const line of this.renderLines(payload, width)) {
      parts.push(this.renderLine(line, width));
    }
    parts.push(this.renderLine("", width));

    // Row, Seat, and Studio line with large bold values
    parts.push(this.renderSeatInfo(payload));

    // Tear-off divider line
    parts.push(this.renderLine("-".repeat(width - LEFT_MARGIN_COLUMNS), width));

    // Stub section for gate (normal weight)
    if (payload.movie) {
      parts.push(this.renderLine(payload.movie, width));
    }

    for (const line of this.renderLines(payload, width)) {
      parts.push(this.renderLine(line, width));
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
      `tanggal tayang : ${formatDate(payload.showDate)}`,
      `jam tayang : ${payload.showTime || "-"}`,
      `harga : Rp ${formattedPrice}`,
    ];
  }

  private renderSeatInfo(payload: TicketPrintPayload): Buffer {
    const rowVal = String(payload.row || payload.seat?.charAt(0) || "-");
    const seatVal = String(payload.seatNumber ?? (payload.seat?.slice(1) || "-"));
    const studioVal = String(payload.studio?.split(" ").pop() || payload.studio || "-");

    const parts: Buffer[] = [
      Buffer.from(" ".repeat(LEFT_MARGIN_COLUMNS), "utf8"),
      Buffer.from("row: ", "utf8"),
      Buffer.from([ESC, 0x45, 0x01, GS, 0x21, 0x11]), // Bold + Double Width & Double Height
      Buffer.from(rowVal, "utf8"),
      Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00]), // Normal font
      Buffer.from(" seat ", "utf8"),
      Buffer.from([ESC, 0x45, 0x01, GS, 0x21, 0x11]), // Bold + Double Width & Double Height
      Buffer.from(seatVal, "utf8"),
      Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00]), // Normal font
      Buffer.from(" studio ", "utf8"),
      Buffer.from([ESC, 0x45, 0x01, GS, 0x21, 0x11]), // Bold + Double Width & Double Height
      Buffer.from(studioVal, "utf8"),
      Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00, LF]), // Normal font + Line Feed
    ];

    return Buffer.concat(parts);
  }

  private renderLine(line: string, width: number): Buffer {
    const contentWidth = width - LEFT_MARGIN_COLUMNS;
    const content = line.slice(0, contentWidth);
    return Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${content}\n`, "utf8");
  }
}

function formatDate(value?: string): string {
  if (!value) return "-";
  const match = value.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}
