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

export type CreateScheduleInput = z.input<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.input<typeof updateScheduleSchema>;
export type CreateScheduleParsed = z.output<typeof createScheduleSchema>;
export type UpdateScheduleParsed = z.output<typeof updateScheduleSchema>;
