import { Router } from "express";
import {
  getUsersController,
  getUserByIdController,
  createUserController,
  updateUserController,
  deleteUserController,
} from "./controller";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";
import { authorize } from "../../middleware/authorize";

const router = Router();

// Apply auth middleware to all routes
router.use(catchAsync(authMiddleware));

router.get("/", authorize("Admin"), catchAsync(getUsersController));
router.get("/:id", authorize("Admin"), catchAsync(getUserByIdController));
router.post("/", authorize("Admin"), catchAsync(createUserController));
router.put("/:id", authorize("Admin"), catchAsync(updateUserController));
router.delete("/:id", authorize("Admin"), catchAsync(deleteUserController));

export default router;
