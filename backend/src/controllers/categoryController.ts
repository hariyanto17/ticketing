import { Request, Response } from "express";
import { responseHandler } from "../utils/responseHandler";

const categories = [{ id: "1", name: "Electronics" }];

export const listCategories = (req: Request, res: Response) => {
  return responseHandler.ok(res, categories, "Categories retrieved", null);
};

export const createCategory = (req: Request, res: Response) => {
  const { name } = req.body;
  const category = { id: `${Date.now()}`, name };
  categories.push(category);
  return responseHandler.created(res, category, "Category created");
};

export const updateCategory = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;
  const category = categories.find((item) => item.id === id);
  if (!category) {
    return responseHandler.ok(res, null, "Category not found");
  }
  category.name = name ?? category.name;
  return responseHandler.ok(res, category, "Category updated", null);
};

export const deleteCategory = (req: Request, res: Response) => {
  const { id } = req.params;
  const index = categories.findIndex((item) => item.id === id);
  if (index !== -1) {
    categories.splice(index, 1);
  }
  return responseHandler.ok(res, { deleted: index !== -1 }, "Category deleted", null);
};
