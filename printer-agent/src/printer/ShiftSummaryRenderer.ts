const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const LEFT_MARGIN_DOTS = 24;
const LEFT_MARGIN_COLUMNS = 3;

export interface ShiftSummaryRenderOptions {
  paperWidth: 58 | 80;
  autoCut: boolean;
}

export interface ShiftSummaryPrintPayload {
  jobId?: string;
  drawerId?: string;
  cashierName?: string;
  closedByName?: string;
  openedAt: string;
  closedAt?: string;
  openingBalance: number;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
  notes?: string | null;
  totalCashSales?: number;
  totalQrisSales?: number;
  totalOtherSales?: number;
  totalSales?: number;
  totalTransactions?: number;
}

export class ShiftSummaryRenderer {
  render(payload: ShiftSummaryPrintPayload, options: ShiftSummaryRenderOptions): Buffer {
    const width = options.paperWidth === 58 ? 32 : 42;
    const parts: Buffer[] = [Buffer.from([ESC, 0x40, GS, 0x4c, LEFT_MARGIN_DOTS, 0x00, ESC, 0x61, 0x00])];

    const contentWidth = width - LEFT_MARGIN_COLUMNS;
    const divider = "-".repeat(contentWidth);
    const doubleDivider = "=".repeat(contentWidth);

    // Header: PLANET CINEMA
    parts.push(this.renderLine(doubleDivider, width));
    parts.push(Buffer.from([ESC, 0x61, 0x01, ESC, 0x45, 0x01, GS, 0x21, 0x01])); // Center, Bold, Double Height
    parts.push(Buffer.from("PLANET CINEMA\n", "utf8"));
    parts.push(Buffer.from([GS, 0x21, 0x00, ESC, 0x45, 0x00])); // Reset size & bold
    parts.push(Buffer.from("REKONSILIASI TUTUP SHIFT\n", "utf8"));
    parts.push(Buffer.from("(END OF SHIFT REPORT)\n", "utf8"));
    parts.push(Buffer.from([ESC, 0x61, 0x00])); // Left
    parts.push(this.renderLine(doubleDivider, width));

    // Session Info
    const openTimeStr = formatDateTime(payload.openedAt);
    const closeTimeStr = formatDateTime(payload.closedAt || new Date().toISOString());

    parts.push(this.renderLine(`Dibuka : ${openTimeStr}`, width));
    parts.push(this.renderLine(`Ditutup: ${closeTimeStr}`, width));
    if (payload.cashierName) {
      parts.push(this.renderLine(`Kasir  : ${payload.cashierName}`, width));
    }
    if (payload.closedByName && payload.closedByName !== payload.cashierName) {
      parts.push(this.renderLine(`Ditutup Oleh: ${payload.closedByName}`, width));
    }
    if (payload.drawerId) {
      parts.push(this.renderLine(`ID Sesi: ${payload.drawerId.slice(0, 18)}...`, width));
    }

    // Sales Breakdown
    parts.push(this.renderLine(divider, width));
    parts.push(Buffer.from([ESC, 0x45, 0x01])); // Bold
    parts.push(this.renderLine("RINGKASAN PENJUALAN TIKET", width));
    parts.push(Buffer.from([ESC, 0x45, 0x00])); // Unbold

    const cashSales = payload.totalCashSales ?? Math.max(0, payload.expectedBalance - payload.openingBalance);
    const qrisSales = payload.totalQrisSales ?? 0;
    const otherSales = payload.totalOtherSales ?? 0;
    const totalSales = payload.totalSales ?? (cashSales + qrisSales + otherSales);

    parts.push(this.renderKeyValue("Penjualan Tunai", `Rp ${formatNumber(cashSales)}`, contentWidth, width));
    parts.push(this.renderKeyValue("Penjualan QRIS", `Rp ${formatNumber(qrisSales)}`, contentWidth, width));
    if (otherSales > 0) {
      parts.push(this.renderKeyValue("Penjualan Lain", `Rp ${formatNumber(otherSales)}`, contentWidth, width));
    }
    if (typeof payload.totalTransactions === "number") {
      parts.push(this.renderKeyValue("Total Transaksi", `${payload.totalTransactions} Trx`, contentWidth, width));
    }
    parts.push(this.renderKeyValue("Total Omzet Sesi", `Rp ${formatNumber(totalSales)}`, contentWidth, width, true));

    // Cash Drawer Reconciliation
    parts.push(this.renderLine(divider, width));
    parts.push(Buffer.from([ESC, 0x45, 0x01])); // Bold
    parts.push(this.renderLine("REKONSILIASI KAS LACI", width));
    parts.push(Buffer.from([ESC, 0x45, 0x00])); // Unbold

    parts.push(this.renderKeyValue("Modal Awal Kas", `Rp ${formatNumber(payload.openingBalance)}`, contentWidth, width));
    parts.push(this.renderKeyValue("(+) Penjualan Tunai", `Rp ${formatNumber(cashSales)}`, contentWidth, width));
    parts.push(this.renderKeyValue("(=) Ekspektasi Kas", `Rp ${formatNumber(payload.expectedBalance)}`, contentWidth, width, true));
    parts.push(this.renderKeyValue("(✓) Fisik Aktual", `Rp ${formatNumber(payload.actualBalance)}`, contentWidth, width, true));

    // Difference & Status
    const diff = payload.difference;
    let statusText = "PAS / SESUAI (KLOP)";
    if (diff < 0) {
      statusText = "DEFISIT / KURANG";
    } else if (diff > 0) {
      statusText = "SURPLUS / LEBIH";
    }

    const diffFormatted = diff > 0 ? `+Rp ${formatNumber(diff)}` : diff < 0 ? `-Rp ${formatNumber(Math.abs(diff))}` : "Rp 0";
    parts.push(this.renderLine(divider, width));
    parts.push(this.renderKeyValue("SELISIH KAS", diffFormatted, contentWidth, width, true));
    parts.push(this.renderKeyValue("STATUS", statusText, contentWidth, width, true));

    // Discrepancy Note
    if (payload.notes && payload.notes.trim()) {
      parts.push(this.renderLine(divider, width));
      parts.push(Buffer.from([ESC, 0x45, 0x01]));
      parts.push(this.renderLine("CATATAN KASIR:", width));
      parts.push(Buffer.from([ESC, 0x45, 0x00]));
      parts.push(this.renderLine(payload.notes.trim(), width));
    }

    // Signatures section for Handover / Audit
    parts.push(this.renderLine(doubleDivider, width));
    parts.push(this.renderLine("", width));
    parts.push(this.renderSignatureLine("Kasir", "Supervisor", contentWidth, width));
    parts.push(this.renderLine("", width));
    parts.push(this.renderLine("", width));
    parts.push(this.renderSignatureLine("(............)", "(............)", contentWidth, width));
    parts.push(this.renderLine("", width));
    parts.push(this.renderLine(doubleDivider, width));

    // Final Feed & Cut
    parts.push(Buffer.from([ESC, 0x45, 0x00, ESC, 0x64, 0x03, LF]));
    if (options.autoCut) {
      parts.push(Buffer.from([GS, 0x56, 0x42, 0x00]));
    }

    return Buffer.concat(parts);
  }

  private renderLine(line: string, width: number): Buffer {
    const contentWidth = width - LEFT_MARGIN_COLUMNS;
    const content = line.slice(0, contentWidth);
    return Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${content}\n`, "utf8");
  }

  private renderKeyValue(key: string, value: string, contentWidth: number, width: number, isBold: boolean = false): Buffer {
    const spaceCount = Math.max(1, contentWidth - key.length - value.length);
    const line = key + " ".repeat(spaceCount) + value;
    const trimmed = line.slice(0, contentWidth);

    const parts: Buffer[] = [];
    if (isBold) {
      parts.push(Buffer.from([ESC, 0x45, 0x01]));
    }
    parts.push(Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${trimmed}\n`, "utf8"));
    if (isBold) {
      parts.push(Buffer.from([ESC, 0x45, 0x00]));
    }
    return Buffer.concat(parts);
  }

  private renderSignatureLine(left: string, right: string, contentWidth: number, width: number): Buffer {
    const spaceCount = Math.max(1, contentWidth - left.length - right.length);
    const line = left + " ".repeat(spaceCount) + right;
    return Buffer.from(`${" ".repeat(LEFT_MARGIN_COLUMNS)}${line.slice(0, contentWidth)}\n`, "utf8");
  }
}

function formatNumber(value?: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value?: string): string {
  if (!value) return "-";
  try {
    const d = new Date(value);
    const dateStr = d.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${dateStr} ${timeStr}`;
  } catch {
    return value;
  }
}
