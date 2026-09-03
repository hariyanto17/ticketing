import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getMoviesController));
router.get("/now-showing", catchAsync(controller.getNowShowingMoviesController));
router.get("/coming-soon", catchAsync(controller.getComingSoonMoviesController));
router.post("/import", authorize("Admin"), catchAsync(controller.importMoviesController));
router.get("/:id", catchAsync(controller.getMovieByIdController));

router.post("/", authorize("Admin"), catchAsync(controller.createMovieController));
router.put("/:id", authorize("Admin"), catchAsync(controller.updateMovieController));
router.delete("/:id", authorize("Admin"), catchAsync(controller.deleteMovieController));

export default router;
