import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getSettingsController));
router.put("/", authorize("Admin"), catchAsync(controller.updateSettingsController));

export default router;
