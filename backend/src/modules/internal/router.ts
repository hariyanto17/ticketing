import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import * as controller from "./controller";
import reportsRouter from "./reports/router";
import { internalAuthMiddleware } from "../../middleware/internalAuthMiddleware";

const router = Router();

router.use(internalAuthMiddleware);

router.get("/summary", catchAsync(controller.getOperationalSummaryHandler));
router.get("/analytics", catchAsync(controller.getAnalyticsDataHandler));
router.get("/activity", catchAsync(controller.getActivityListHandler));
router.get("/transactions", catchAsync(controller.getTransactionsListHandler));
router.post("/payments/notification", catchAsync(controller.handlePlatformPaymentNotificationHandler));
router.use("/reports", reportsRouter);

export default router;
