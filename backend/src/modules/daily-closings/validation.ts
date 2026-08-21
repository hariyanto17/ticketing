import { z } from "zod";

export const createClosingSchema = z.object({
  businessDate: z.string().transform((str) => new Date(str)),
});

export type CreateClosingInput = z.infer<typeof createClosingSchema>;
