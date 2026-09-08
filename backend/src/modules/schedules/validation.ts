import { z } from "zod";

export const createScheduleSchema = z.object({
  movieId: z.string().uuid("Movie ID is required"),
  studioId: z.string().uuid("Studio ID is required"),
  startTime: z.string().transform((str) => new Date(str)),
  ticketPrice: z.number().positive("Ticket price must be positive"),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("DRAFT"),
});

export const updateScheduleSchema = z.object({
  movieId: z.string().uuid("Movie ID is required").optional(),
  studioId: z.string().uuid("Studio ID is required").optional(),
  startTime: z.string().transform((str) => new Date(str)).optional(),
  ticketPrice: z.number().positive("Ticket price must be positive").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
});

export const copySchedulesSchema = z.object({
  sourceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal sumber tidak valid (YYYY-MM-DD)").optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal target tidak valid (YYYY-MM-DD)").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).optional(),
});

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.input<typeof updateScheduleSchema>;
export type CopySchedulesInput = z.input<typeof copySchedulesSchema>;
export type CreateScheduleParsed = z.output<typeof createScheduleSchema>;
export type UpdateScheduleParsed = z.output<typeof updateScheduleSchema>;
export type CopySchedulesParsed = z.output<typeof copySchedulesSchema>;
