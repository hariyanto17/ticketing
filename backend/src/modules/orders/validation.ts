import { z } from "zod";

export const checkoutSchema = z.object({
  scheduleId: z.string().uuid("Schedule ID is required"),
  seatIds: z.array(z.string().uuid("Invalid seat ID")).min(1, "Select at least one seat"),
  paymentMethod: z.enum(["CASH", "QRIS"]),
  amountReceived: z.number().nonnegative().optional().nullable(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const refundSchema = z.object({
  reason: z.string().min(1, "Refund reason is required"),
});

export type RefundInput = z.infer<typeof refundSchema>;
