import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getPHsController));
router.get("/:id", catchAsync(controller.getPHByIdController));

router.post("/", authorize("Admin"), catchAsync(controller.createPHController));
router.put("/:id", authorize("Admin"), catchAsync(controller.updatePHController));
router.delete("/:id", authorize("Admin"), catchAsync(controller.deletePHController));

export default router;
