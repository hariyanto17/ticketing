import { z } from "zod";

export const validateTicketSchema = z.object({
  ticketNumber: z.string().min(1, "Ticket number is required"),
});

export type ValidateTicketInput = z.infer<typeof validateTicketSchema>;
