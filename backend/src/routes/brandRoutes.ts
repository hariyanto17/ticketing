import { Router } from "express";
import { listBrands, createBrand, updateBrand, deleteBrand } from "../controllers/brandController";
import { catchAsync } from "../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(listBrands));
router.post("/", catchAsync(createBrand));
router.put("/:id", catchAsync(updateBrand));
router.delete("/:id", catchAsync(deleteBrand));

export default router;
