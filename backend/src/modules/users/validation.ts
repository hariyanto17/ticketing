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

export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  phone: z.string().optional().nullable(),
  currentPassword: z.string().optional().nullable(),
  newPassword: z.string().optional().nullable(),
  confirmPassword: z.string().optional().nullable(),
}).refine(
  (data) => {
    if (data.newPassword && data.newPassword.trim().length > 0) {
      if (data.newPassword.length < 6) return false;
    }
    return true;
  },
  {
    message: "New password must be at least 6 characters",
    path: ["newPassword"],
  }
).refine(
  (data) => {
    if (data.newPassword && data.newPassword.trim().length > 0) {
      return !!data.currentPassword && data.currentPassword.trim().length > 0;
    }
    return true;
  },
  {
    message: "Current password is required to set a new password",
    path: ["currentPassword"],
  }
).refine(
  (data) => {
    if (data.newPassword && data.newPassword.trim().length > 0) {
      return data.newPassword === data.confirmPassword;
    }
    return true;
  },
  {
    message: "New password and confirmation password do not match",
    path: ["confirmPassword"],
  }
);

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
