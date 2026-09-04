import { z } from "zod";

export const validateTicketSchema = z.object({
  ticketNumber: z.string().min(1, "Ticket number is required"),
});

export const kioskLookupSchema = z.object({
  query: z.string().min(1, "Booking code, ticket number, or phone number is required"),
});

export const kioskPrintLogSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
});

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
export type KioskLookupInput = z.infer<typeof kioskLookupSchema>;
export type KioskPrintLogInput = z.infer<typeof kioskPrintLogSchema>;

