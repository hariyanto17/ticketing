import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getSchedulesController));
router.get("/:id", catchAsync(controller.getScheduleByIdController));

router.post("/copy-yesterday", authorize("Admin", "Projectionist"), catchAsync(controller.copySchedulesController));
router.post("/copy", authorize("Admin", "Projectionist"), catchAsync(controller.copySchedulesController));
router.post("/", authorize("Admin", "Projectionist"), catchAsync(controller.createScheduleController));
router.put("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.updateScheduleController));
router.delete("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.deleteScheduleController));

// Seat availability and reservation lifecycle endpoints
router.get("/:id/seats", catchAsync(controller.getScheduleSeatsController));
router.post("/:id/hold", catchAsync(controller.holdSeatsController));
router.post("/:id/release", catchAsync(controller.releaseSeatsController));

export default router;
