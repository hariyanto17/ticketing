import { Router } from "express";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../controllers/categoryController";
import { catchAsync } from "../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(listCategories));
router.post("/", catchAsync(createCategory));
router.put("/:id", catchAsync(updateCategory));
router.delete("/:id", catchAsync(deleteCategory));

export default router;
