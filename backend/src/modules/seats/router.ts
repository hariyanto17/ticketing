import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getSeatsController));
router.post("/", authorize("Admin"), catchAsync(controller.createSeatController));
router.put("/:id", authorize("Admin"), catchAsync(controller.updateSeatController));
router.delete("/:id", authorize("Admin"), catchAsync(controller.deleteSeatController));

// Batch layout update endpoint
router.post("/layout", authorize("Admin"), catchAsync(controller.saveLayoutController));

// Validate removal (row or column)
router.get("/validate-removal", authorize("Admin"), catchAsync(controller.validateRemovalController));

export default router;
