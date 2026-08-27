import { Router, Request, Response, NextFunction } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/errorHandler";
import crypto from "crypto";
import * as controller from "./controller";
import reportsRouter from "./reports/router";

const router = Router();

const authenticateInternal = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-platform-internal-key"]?.toString();
  const expectedKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  let isMatch = false;
  if (apiKey) {
    const aBuf = Buffer.from(apiKey);
    const bBuf = Buffer.from(expectedKey);
    if (aBuf.length === bBuf.length) {
      isMatch = crypto.timingSafeEqual(aBuf, bBuf);
    }
  }

  if (!isMatch) {
    return next(new AppError("UNAUTHORIZED", "Invalid or missing internal service credential"));
  }

  next();
};

router.use(authenticateInternal);

router.get("/summary", catchAsync(controller.getOperationalSummaryHandler));
router.get("/analytics", catchAsync(controller.getAnalyticsDataHandler));
router.get("/activity", catchAsync(controller.getActivityListHandler));
router.get("/transactions", catchAsync(controller.getTransactionsListHandler));
router.use("/reports", reportsRouter);

export default router;
