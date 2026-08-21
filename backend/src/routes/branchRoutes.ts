import { Router } from "express";
import { catchAsync } from "../utils/catchAsync";
import { authMiddleware } from "../middleware/authMiddleware";
import { createBranch, deleteBranch, getBranchById, getBranches, updateBranch } from "../controllers/branchController";

const router = Router();

router.use(authMiddleware);
router.get("/", catchAsync(getBranches));
router.get("/:id", catchAsync(getBranchById));
router.post("/", catchAsync(createBranch));
router.put("/:id", catchAsync(updateBranch));
router.delete("/:id", catchAsync(deleteBranch));

export default router;
