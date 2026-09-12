import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

// Public App Update Check Endpoint for Mobile / Kiosk Clients
router.get("/check", catchAsync(controller.checkAppUpdateController));

// Admin-only Endpoint to publish new OTA Bundle / Version
router.post(
  "/publish",
  catchAsync(authMiddleware),
  authorize("Admin", "ADMIN", "SUPERADMIN"),
  catchAsync(controller.publishOtaReleaseController)
);

export default router;
