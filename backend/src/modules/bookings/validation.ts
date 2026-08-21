import { z } from "zod";

export const createBookingSchema = z.object({
  scheduleId: z.string().uuid("Invalid schedule ID"),
  seatIds: z.array(z.string()).nonempty("Select at least one seat"),
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
