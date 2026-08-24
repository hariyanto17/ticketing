import { Router } from "express";
import { login, logout, me, sso } from "../controllers/authController";
import { catchAsync } from "../utils/catchAsync";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/login", catchAsync(login));
router.post("/sso", catchAsync(sso));
router.post("/logout", catchAsync(logout));
router.get("/me", authMiddleware, catchAsync(me));

export default router;
