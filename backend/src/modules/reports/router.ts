import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", authorize("Admin", "Projectionist"), catchAsync(controller.getReportsController));
router.get("/film-sales/movies", authorize("Admin", "Cashier", "ADMIN", "KASIR"), catchAsync(controller.getFilmSalesMoviesController));
router.get("/film-sales/showing-dates", authorize("Admin", "Cashier", "ADMIN", "KASIR"), catchAsync(controller.getFilmShowingDatesController));
router.get("/film-sales/export/excel", authorize("Admin", "Cashier", "ADMIN", "KASIR"), catchAsync(controller.exportFilmSalesExcelController));
router.get("/film-sales", authorize("Admin", "Cashier", "ADMIN", "KASIR"), catchAsync(controller.getFilmSalesReportController));

export default router;
