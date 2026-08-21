import { Router } from "express";
import {
  listProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductByBarcode,
  getProductLocations,
} from "../controllers/productController";
import { catchAsync } from "../utils/catchAsync";

const router = Router();

router.get("/", catchAsync(listProducts));
router.get("/search", catchAsync(searchProducts));
router.get("/barcode/:barcode", catchAsync(getProductByBarcode));
router.get("/:id/locations", catchAsync(getProductLocations));
router.get("/:id", catchAsync(getProductDetail));
router.post("/", catchAsync(createProduct));
router.put("/:id", catchAsync(updateProduct));
router.delete("/:id", catchAsync(deleteProduct));

export default router;
