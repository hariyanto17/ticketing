import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getStudiosController));
router.get("/:id", catchAsync(controller.getStudioByIdController));

router.post("/", authorize("Admin", "Projectionist"), catchAsync(controller.createStudioController));
router.post("/:id/copy-layout", authorize("Admin", "Projectionist"), catchAsync(controller.copyLayoutController));
router.put("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.updateStudioController));
router.delete("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.deleteStudioController));

export default router;
