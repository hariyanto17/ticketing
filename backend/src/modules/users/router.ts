import { Router } from "express";
import {
  getUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
  getProfileController,
  updateProfileController,
} from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

// Apply auth middleware to all routes
router.use(catchAsync(authMiddleware));

// Profile routes available for all authenticated roles
router.get("/profile", catchAsync(getProfileController));
router.put("/profile", catchAsync(updateProfileController));

// Admin-only user management routes
router.get("/", authorize("Admin"), catchAsync(getUsersController));
router.get("/:id", authorize("Admin"), catchAsync(getUserByIdController));
router.post("/", authorize("Admin"), catchAsync(createUserController));
router.put("/:id", authorize("Admin"), catchAsync(updateUserController));
router.delete("/:id", authorize("Admin"), catchAsync(deleteUserController));

export default router;
