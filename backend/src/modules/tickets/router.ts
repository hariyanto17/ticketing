import { Router } from "express";
import * as controller from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.use(catchAsync(authMiddleware));

router.post("/validate", catchAsync(controller.validateTicketController));
router.post("/:id/reprint", catchAsync(controller.reprintTicketController));

export default router;
