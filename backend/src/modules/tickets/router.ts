import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

// Kiosk Self-Service Routes (Can be accessed by kiosk terminals or customer mobile app)
router.post("/kiosk/lookup", catchAsync(controller.kioskLookupController));
router.post("/kiosk/print-log", catchAsync(controller.kioskPrintLogController));
router.post("/kiosk/trigger-print", catchAsync(controller.kioskTriggerPrintController));

// Authenticated Operator Routes
router.use(catchAsync(authMiddleware));

router.post("/validate", catchAsync(controller.validateTicketController));
router.post("/:id/reprint", catchAsync(controller.reprintTicketController));

export default router;

