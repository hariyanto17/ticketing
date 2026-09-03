import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

import {
  getMoviesController,
  getNowShowingMoviesController,
  getComingSoonMoviesController,
  getMovieByIdController,
} from "../movies/controller";
import { getSchedulesController, getScheduleSeatsController } from "../schedules/controller";
import * as scheduleService from "../schedules/service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";

const router = Router();

// ====================
// PUBLIC GUEST ROUTES
// ====================

// 1. Movie Listings (Dedicated endpoints for Now Showing & Coming Soon)
router.get("/movies", catchAsync(getMoviesController));
router.get("/movies/now-showing", catchAsync(getNowShowingMoviesController));
router.get("/movies/coming-soon", catchAsync(getComingSoonMoviesController));
router.get("/movies/:id", catchAsync(getMovieByIdController));

// 2. Schedules & Seats Map
router.get("/schedules", catchAsync(getSchedulesController));
router.get("/schedules/:id/seats", catchAsync(getScheduleSeatsController));

// 3. 10-Minute Guest Seat Hold
router.post(
  "/schedules/:id/hold",
  catchAsync(async (req, res) => {
    const { seatIds } = req.body;
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new AppError("BAD_REQUEST", "seatIds array is required");
    }
    // Guest holds seats for 10 minutes
    const result = await scheduleService.holdSeats(req.params.id, seatIds, 10);
    return responseHandler.ok(res, result, "Seats held for guest checkout successfully");
  })
);

router.post(
  "/schedules/:id/release",
  catchAsync(async (req, res) => {
    const { seatIds } = req.body;
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new AppError("BAD_REQUEST", "seatIds array is required");
    }
    await scheduleService.releaseSeats(req.params.id, seatIds);
    return responseHandler.ok(res, null, "Seats released successfully");
  })
);

// 4. Guest checkout / Booking Lookup
router.post("/", catchAsync(controller.createBookingController));
router.get("/lookup", catchAsync(controller.lookupBookingController));


// ====================
// ADMIN SECURED ROUTES
// ====================
router.use(catchAsync(authMiddleware));
router.use(authorize("Admin"));

router.get("/admin/list", catchAsync(controller.getAdminBookingsController));
router.put("/admin/:id/payment", catchAsync(controller.confirmBookingPaymentController));
router.put("/admin/:id/cancel", catchAsync(controller.cancelBookingController));

export default router;
