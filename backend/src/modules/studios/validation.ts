import { z } from "zod";

export const createStudioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z.string().min(1, "Code is required").max(10),
  capacity: z.number().int().positive("Capacity must be positive"),
  layoutRows: z.number().int().positive().optional(),
  layoutColumns: z.number().int().positive().optional(),
  type: z.enum(["REGULAR", "PREMIERE", "VIP"]).default("REGULAR"),
  status: z.enum(["ACTIVE", "MAINTENANCE", "CLOSED"]).default("ACTIVE"),
  branchId: z.string().uuid("Branch ID is required").optional().nullable(),
});

export const updateStudioSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  code: z.string().min(1, "Code is required").max(10).optional(),
  capacity: z.number().int().positive("Capacity must be positive").optional(),
  layoutRows: z.number().int().positive().optional(),
  layoutColumns: z.number().int().positive().optional(),
  type: z.enum(["REGULAR", "PREMIERE", "VIP"]).optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "CLOSED"]).optional(),
  branchId: z.string().uuid("Branch ID is required").optional().nullable(),
});

export type CreateStudioInput = z.infer<typeof createStudioSchema>;
export type UpdateStudioInput = z.infer<typeof updateStudioSchema>;
