import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { MIDTRANS_IS_PRODUCTION, NODE_ENV } from "../../config/constant";

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

if (NODE_ENV !== "production" && !MIDTRANS_IS_PRODUCTION) {
  router.post(
    "/qris/simulate-success/:orderId",
    catchAsync(controller.simulateQrisPaymentSuccessController)
  );
}

export default router;
