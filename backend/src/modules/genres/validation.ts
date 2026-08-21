import { z } from "zod";

export const createGenreSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const updateGenreSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateGenreInput = z.infer<typeof createGenreSchema>;
export type UpdateGenreInput = z.infer<typeof updateGenreSchema>;
