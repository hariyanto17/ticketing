import { z } from "zod";

export const createDistributorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateDistributorSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateDistributorInput = z.infer<typeof createDistributorSchema>;
export type UpdateDistributorInput = z.infer<typeof updateDistributorSchema>;
