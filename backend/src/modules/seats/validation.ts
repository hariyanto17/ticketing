import { z } from "zod";

export const seatSchema = z.object({
  id: z.string().uuid().optional(),
  studioId: z.string().uuid("Studio ID is required"),
  row: z.string().min(1, "Row is required").max(5),
  column: z.number().int().positive("Column must be positive"),
  seatNumber: z.number().int().positive("Seat number must be positive"),
  seatLabel: z.string().min(1, "Label is required"),
  seatType: z.enum(["REGULAR", "VIP", "COUPLE", "WHEELCHAIR"]).default("REGULAR"),
  status: z.enum(["ACTIVE", "DISABLED"]).default("ACTIVE"),
});

export const batchLayoutSchema = z.object({
  studioId: z.string().uuid("Studio ID is required"),
  seats: z.array(seatSchema),
  force: z.boolean().optional(),
});

export type SeatInput = z.infer<typeof seatSchema>;
export type BatchLayoutInput = z.infer<typeof batchLayoutSchema>;
