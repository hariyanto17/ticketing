import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get("/", catchAsync(controller.getOrdersController));
router.get("/:id", catchAsync(controller.getOrderByIdController));
router.post("/checkout", catchAsync(controller.checkoutOrderController));
router.post("/:id/void", authorize("Admin", "Cashier"), catchAsync(controller.voidOrderController));
router.post("/tickets/:ticketId/refund", catchAsync(controller.refundTicketController));

export default router;
