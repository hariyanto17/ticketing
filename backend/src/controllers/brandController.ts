import { Request, Response } from "express";
import { responseHandler } from "../utils/responseHandler";

const brands = [{ id: "1", name: "Samsung" }];

export const listBrands = (req: Request, res: Response) => {
  return responseHandler.ok(res, brands, "Brands retrieved", null);
};

export const createBrand = (req: Request, res: Response) => {
  const { name } = req.body;
  const brand = { id: `${Date.now()}`, name };
  brands.push(brand);
  return responseHandler.created(res, brand, "Brand created");
};

export const updateBrand = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const brand = brands.find((item) => item.id === id);
  if (!brand) {
    return responseHandler.ok(res, null, "Brand not found");
  }
  brand.name = name ?? brand.name;
  return responseHandler.ok(res, brand, "Brand updated", null);
};

export const deleteBrand = (req: Request, res: Response) => {
  const { id } = req.params;
  const index = brands.findIndex((item) => item.id === id);
  if (index !== -1) {
    brands.splice(index, 1);
  }
  return responseHandler.ok(res, { deleted: index !== -1 }, "Brand deleted", null);
};
