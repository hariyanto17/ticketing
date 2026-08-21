import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(50, "Username must be less than 50 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(100, "Password must be less than 100 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
