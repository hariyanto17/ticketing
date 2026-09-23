import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/active", catchAsync(controller.getActivePromotionsController));
router.post("/calculate", catchAsync(controller.calculatePromoPreviewController));
router.get("/", catchAsync(controller.getPromotionsController));
router.get("/:id", catchAsync(controller.getPromotionByIdController));

router.post("/", authorize("Admin", "Manager"), catchAsync(controller.createPromotionController));
router.put("/:id", authorize("Admin", "Manager"), catchAsync(controller.updatePromotionController));
router.delete("/:id", authorize("Admin", "Manager"), catchAsync(controller.deletePromotionController));

export default router;
