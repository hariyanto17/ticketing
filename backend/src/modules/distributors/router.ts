import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getDistributorsController));
router.get("/:id", catchAsync(controller.getDistributorByIdController));

router.post("/", authorize("Admin"), catchAsync(controller.createDistributorController));
router.put("/:id", authorize("Admin"), catchAsync(controller.updateDistributorController));
router.delete("/:id", authorize("Admin"), catchAsync(controller.deleteDistributorController));

export default router;
