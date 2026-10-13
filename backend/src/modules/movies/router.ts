import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";
import { AppError } from "../../utils/errorHandler";
import bodyParser from "body-parser";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getMoviesController));
router.get("/now-showing", catchAsync(controller.getNowShowingMoviesController));
router.get("/coming-soon", catchAsync(controller.getComingSoonMoviesController));
router.post("/import", authorize("Admin", "Projectionist"), catchAsync(controller.importMoviesController));
const parseSchedulePosterPng = bodyParser.raw({ type: "image/png", limit: "10mb" });
router.post(
  "/schedule-poster/video",
  authorize("Admin", "Projectionist"),
  (req, res, next) => {
    parseSchedulePosterPng(req, res, (error) => {
      if (
        error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "entity.too.large"
      ) {
        return next(new AppError("PAYLOAD_TOO_LARGE", "The TV poster image exceeds the 10 MiB limit."));
      }
      return next(error);
    });
  },
  (req, res, next) => {
    void controller.createSchedulePosterVideoController(req, res).catch(next);
  }
);
router.get("/:id/poster", catchAsync(controller.getMoviePosterController));
router.get("/:id", catchAsync(controller.getMovieByIdController));

router.post("/", authorize("Admin", "Projectionist"), catchAsync(controller.createMovieController));
router.put("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.updateMovieController));
router.delete("/:id", authorize("Admin", "Projectionist"), catchAsync(controller.deleteMovieController));

export default router;
