import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getGenresController));
router.get("/:id", catchAsync(controller.getGenreByIdController));

// Modifying operations restricted to Admin
router.post("/", authorize("Admin"), catchAsync(controller.createGenreController));
router.put("/:id", authorize("Admin"), catchAsync(controller.updateGenreController));
router.delete("/:id", authorize("Admin"), catchAsync(controller.deleteGenreController));

export default router;
