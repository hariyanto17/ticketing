import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().uuid("Invalid Role ID"),
  branchId: z.string().uuid("Invalid Branch ID"),
});

export const updateUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(50).optional(),
  name: z.string().min(1, "Name is required").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().nullable(),
  roleId: z.string().uuid("Invalid Role ID").optional(),
  branchId: z.string().uuid("Invalid Branch ID").optional(),
  isActive: z.boolean().optional(),
  status: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
