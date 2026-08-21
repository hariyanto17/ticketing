import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import { authMiddleware } from "../middleware/authMiddleware";
import { createUser, getUsers, getUserById, updateUser, deleteUser } from "../controllers/userController";

const router = Router();

router.use(authMiddleware);
router.get("/", catchAsync(getUsers));
router.get("/:id", catchAsync(getUserById));
router.post("/", catchAsync(createUser));
router.put("/:id", catchAsync(updateUser));
router.delete("/:id", catchAsync(deleteUser));

export default router;
