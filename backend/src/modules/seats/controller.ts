import { Request, Response } from "express";
import { seatSchema, batchLayoutSchema } from "./validation";
import * as seatService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { prisma } from "../../utils/prisma";

export const getSeatsController = async (req: Request, res: Response) => {
  const { studioId } = req.query;
  if (!studioId) {
    throw new AppError("BAD_REQUEST", "Studio ID is required");
  }

  const seats = await seatService.getSeatsByStudio(studioId as string);
  return responseHandler.ok(res, seats, "Seats retrieved");
};

export const createSeatController = async (req: Request, res: Response) => {
  const result = seatSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const seat = await seatService.createSeat(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SEAT",
      action: "CREATE",
      newData: seat,
    });
  }

  return responseHandler.created(res, seat, "Seat created");
};

export const updateSeatController = async (req: Request, res: Response) => {
  const result = seatSchema.partial().safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldSeat = await prisma?.seat.findUnique({ where: { id: req.params.id } });
  const seat = await seatService.updateSeat(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SEAT",
      action: "UPDATE",
      oldData: oldSeat,
      newData: seat,
    });
  }

  return responseHandler.ok(res, seat, "Seat updated");
};

export const deleteSeatController = async (req: Request, res: Response) => {
  const oldSeat = await prisma?.seat.findUnique({ where: { id: req.params.id } });
  await seatService.deleteSeat(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SEAT",
      action: "DELETE",
      oldData: oldSeat,
    });
  }

  return responseHandler.ok(res, null, "Seat deleted");
};

export const saveLayoutController = async (req: Request, res: Response) => {
  const result = batchLayoutSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }
  const force = Boolean((req.body && (req.body.force === true || req.body.force === "true")) || false);

  const resultData = await seatService.saveBatchLayout(result.data.studioId, result.data.seats, { force });
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "SEAT",
      action: "SAVE-LAYOUT",
      newData: { studioId: result.data.studioId, created: resultData.created?.length || 0, updated: resultData.updated?.length || 0, removed: resultData.removed?.length || 0 },
    });
  }

  return responseHandler.ok(res, resultData, "Seat layout saved successfully");
};

export const validateRemovalController = async (req: Request, res: Response) => {
  const { studioId, row, column } = req.query;
  if (!studioId) throw new AppError("BAD_REQUEST", "studioId is required");

  const colNum = column ? parseInt(column as string, 10) : undefined;
  const result = await seatService.validateRemoval(studioId as string, { row: row as string | undefined, column: colNum });
  return responseHandler.ok(res, result, "Validation result");
};
