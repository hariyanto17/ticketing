import { z } from "zod";

export const createPHSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updatePHSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreatePHInput = z.infer<typeof createPHSchema>;
export type UpdatePHInput = z.infer<typeof updatePHSchema>;
