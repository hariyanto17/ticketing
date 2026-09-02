import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// 1. Midtrans Webhook Notification Endpoint (Public, Unauthenticated)
router.post(
  "/midtrans/notification",
  catchAsync(controller.midtransNotificationController)
);

// 2. Midtrans Snap Token Generation for an Order
router.post(
  "/midtrans/snap/:orderId",
  catchAsync(controller.createSnapTransactionController)
);

// 3. Payment Status Check
router.get(
  "/status/:orderId",
  catchAsync(controller.getPaymentStatusController)
);

export default router;
