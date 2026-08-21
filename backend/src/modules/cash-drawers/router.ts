import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/active", catchAsync(controller.getActiveDrawerController));
router.post("/open", catchAsync(controller.openDrawerController));
router.post("/close", catchAsync(controller.closeDrawerController));
router.get("/history", catchAsync(controller.getDrawersHistoryController));

export default router;
