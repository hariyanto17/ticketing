import { Router } from "express";
import { login, logout, me, sso, ssoSync } from "../controllers/authController";
import { catchAsync } from "../utils/catchAsync";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(login));
router.post("/sso", catchAsync(sso));
router.post("/sso/sync", catchAsync(ssoSync));
router.post("/logout", catchAsync(logout));
router.get("/me", authMiddleware, catchAsync(me));

export default router;
