import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/summary", catchAsync(controller.getClosingSummaryController));
router.post("/", authorize("Admin", "Cashier"), catchAsync(controller.createClosingController));
router.get("/history", catchAsync(controller.getClosingsHistoryController));

export default router;
