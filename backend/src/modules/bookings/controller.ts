import { Request, Response } from "express";
import { createBookingSchema } from "./validation";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const createBookingController = async (req: Request, res: Response) => {
  const result = createBookingSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const output = await service.createGuestBooking(result.data);

  // Note: Guest booking doesn't have req.user, log with system/guest indicator
  await logActivity({
    userId: null,
    module: "GUEST-BOOKING",
    action: "CREATE",
    newData: output.order,
  } as any);

  return responseHandler.created(res, output, "Guest booking reserved successfully");
};

export const lookupBookingController = async (req: Request, res: Response) => {
  const { query } = req.query;
  if (!query || typeof query !== "string") {
    throw new AppError("BAD_REQUEST", "query parameter is required");
  }

  const bookings = await service.lookupBooking(query);
  return responseHandler.ok(res, bookings, "Booking details retrieved");
};

export const getAdminBookingsController = async (req: Request, res: Response) => {
  const bookings = await service.getAdminBookings();
  return responseHandler.ok(res, bookings, "Admin bookings retrieved");
};

export const confirmBookingPaymentController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User must be authenticated");

  const order = await service.confirmBookingPayment(req.params.id);

  await logActivity({
    userId: req.user.id,
    module: "GUEST-BOOKING",
    action: "CONFIRM-PAYMENT",
    newData: order,
  });

  return responseHandler.ok(res, order, "Guest booking payment confirmed and tickets issued");
};

export const cancelBookingController = async (req: Request, res: Response) => {
  const order = await service.cancelBooking(req.params.id);

  const userId = req.user ? req.user.id : null;

  await logActivity({
    userId,
    module: "GUEST-BOOKING",
    action: "CANCEL",
    newData: order,
  } as any);

  return responseHandler.ok(res, order, "Guest booking cancelled successfully");
};
