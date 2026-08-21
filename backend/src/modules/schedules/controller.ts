import { Request, Response } from "express";
import { createScheduleSchema, updateScheduleSchema } from "./validation";
import * as scheduleService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getSchedulesController = async (req: Request, res: Response) => {
  const { movieId, studioId, status } = req.query;

  const schedules = await scheduleService.getAllSchedules({
    movieId: movieId as string,
    studioId: studioId as string,
    status: status as string,
  });

  return responseHandler.ok(res, schedules, "Schedules retrieved");
};

export const getScheduleByIdController = async (req: Request, res: Response) => {
  const schedule = await scheduleService.getScheduleById(req.params.id);
  return responseHandler.ok(res, schedule, "Schedule retrieved");
};

export const createScheduleController = async (req: Request, res: Response) => {
  const result = createScheduleSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const schedule = await scheduleService.createSchedule(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SCHEDULE",
      action: "CREATE",
      newData: schedule,
    });
  }

  return responseHandler.created(res, schedule, "Schedule created successfully");
};

export const updateScheduleController = async (req: Request, res: Response) => {
  const result = updateScheduleSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldSchedule = await scheduleService.getScheduleById(req.params.id);
  const schedule = await scheduleService.updateSchedule(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SCHEDULE",
      action: "UPDATE",
      oldData: oldSchedule,
      newData: schedule,
    });
  }

  return responseHandler.ok(res, schedule, "Schedule updated successfully");
};

export const deleteScheduleController = async (req: Request, res: Response) => {
  const oldSchedule = await scheduleService.getScheduleById(req.params.id);
  await scheduleService.deleteSchedule(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SCHEDULE",
      action: "DELETE",
      oldData: oldSchedule,
    });
  }

  return responseHandler.ok(res, null, "Schedule deleted successfully");
};

export const getScheduleSeatsController = async (req: Request, res: Response) => {
  const seats = await scheduleService.getScheduleSeats(req.params.id);
  return responseHandler.ok(res, seats, "Seats retrieved successfully");
};

export const holdSeatsController = async (req: Request, res: Response) => {
  const { seatIds } = req.body;
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new AppError("BAD_REQUEST", "seatIds array is required");
  }

  const result = await scheduleService.holdSeats(req.params.id, seatIds);
  return responseHandler.ok(res, result, "Seats held successfully");
};

export const releaseSeatsController = async (req: Request, res: Response) => {
  const { seatIds } = req.body;
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    throw new AppError("BAD_REQUEST", "seatIds array is required");
  }

  await scheduleService.releaseSeats(req.params.id, seatIds);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SCHEDULE",
      action: "RELEASE-SEATS",
      newData: { scheduleId: req.params.id, seatIds },
    });
  }

  return responseHandler.ok(res, null, "Seats released successfully");
};

