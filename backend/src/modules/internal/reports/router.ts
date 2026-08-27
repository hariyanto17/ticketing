import { Router } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import * as controller from "./controller";

const router = Router();

router.get("/movies", catchAsync(controller.getMoviePerformanceHandler));
router.get("/schedules", catchAsync(controller.getShowtimePerformanceHandler));

export default router;
