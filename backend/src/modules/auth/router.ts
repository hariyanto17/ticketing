import { Router } from "express";
import { loginController, logoutController, meController, ssoController, ssoSyncController } from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(loginController));
router.post("/sso", catchAsync(ssoController));
router.post("/sso/sync", catchAsync(ssoSyncController));
router.post("/logout", catchAsync(logoutController));
router.get("/me", catchAsync(authMiddleware), catchAsync(meController));

export default router;
