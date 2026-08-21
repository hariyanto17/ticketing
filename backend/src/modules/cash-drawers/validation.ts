import { z } from "zod";

export const openDrawerSchema = z.object({
  openingBalance: z.number().nonnegative("Opening balance must be zero or positive"),
});

export const closeDrawerSchema = z.object({
  actualBalance: z.number().nonnegative("Actual balance must be zero or positive"),
});

export type OpenDrawerInput = z.infer<typeof openDrawerSchema>;
export type CloseDrawerInput = z.infer<typeof closeDrawerSchema>;
