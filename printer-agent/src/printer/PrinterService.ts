import type { PrinterInfo } from "./PrinterDiscovery.js";

export type PrintStatus = "ready" | "offline" | "busy" | "error";
export type PrintMode = "print" | "reprint";

export interface TicketPrintPayload {
  jobId?: string;
  mode?: PrintMode;
  ticketNumber?: string;
  orderNumber?: string;
  movie?: string;
  studio?: string;
  showDate?: string;
  showTime?: string;
  seat?: string;
  row?: string;
  seatNumber?: number;
  price?: number;
  qrCode?: string;
  customerName?: string;
  totalAmount?: number;
}

export interface PrintJob {
  jobId: string;
  payload: TicketPrintPayload;
}

export abstract class PrinterService {
  abstract getStatus(): Promise<PrintStatus>;
  abstract listPrinters(): Promise<PrinterInfo[]>;
  abstract printTest(): Promise<{ jobId: string; status: string; error?: string }>;
  abstract printTicket(payload: TicketPrintPayload): Promise<{ jobId: string; status: string; error?: string }>;
  abstract close(): Promise<void>;
}
