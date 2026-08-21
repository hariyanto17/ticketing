import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import { authMiddleware } from "../middleware/authMiddleware";
import { createRole, deleteRole, getRoleById, getRoles, updateRole } from "../controllers/roleController";

const router = Router();

router.use(authMiddleware);
router.get("/", catchAsync(getRoles));
router.get("/:id", catchAsync(getRoleById));
router.post("/", catchAsync(createRole));
router.put("/:id", catchAsync(updateRole));
router.delete("/:id", catchAsync(deleteRole));

export default router;
