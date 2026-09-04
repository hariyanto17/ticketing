import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// 1. Midtrans Webhook Notification Endpoint (Public, Unauthenticated)
router.post(
  "/midtrans/notification",
  catchAsync(controller.midtransNotificationController)
);

// 2. Direct Midtrans Core API QRIS Payment Generation
router.post(
  "/qris/:orderId",
  catchAsync(controller.createQrisPaymentController)
);

// 3. Midtrans Snap Token Generation for an Order (Legacy/Admin)
router.post(
  "/midtrans/snap/:orderId",
  catchAsync(controller.createSnapTransactionController)
);

// 4. Payment Status Check
router.get(
  "/status/:orderId",
  catchAsync(controller.getPaymentStatusController)
);

// 5. Simulated QRIS Payment Success (Sandbox/Development Only)
router.post(
  "/qris/simulate-success/:orderId",
  catchAsync(controller.simulateQrisPaymentSuccessController)
);

export default router;
