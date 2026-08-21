import { Request, Response } from "express";
import { responseHandler } from "../utils/responseHandler";

const products = [
  { id: "1", name: "Laptop", barcode: "12345", stock: 10, locations: ["Warehouse A"] },
  { id: "2", name: "Phone", barcode: "54321", stock: 5, locations: ["Warehouse B"] },
];

export const listProducts = (req: Request, res: Response) => {
  const q = req.query.q as string | undefined;
  const data = q
    ? products.filter((product) => product.name.toLowerCase().includes(q.toLowerCase()))
    : products;
  return responseHandler.ok(res, data, "Products retrieved", null);
};

export const getProductDetail = (req: Request, res: Response) => {
  const product = products.find((item) => item.id === req.params.id);
  return responseHandler.ok(res, product ?? null, "Product detail retrieved", null);
};

export const createProduct = (req: Request, res: Response) => {
  const product = { id: `${Date.now()}`, ...req.body };
  products.push(product);
  return responseHandler.created(res, product, "Product created");
};

export const updateProduct = (req: Request, res: Response) => {
  const product = products.find((item) => item.id === req.params.id);
  if (!product) {
    return responseHandler.ok(res, null, "Product not found", null);
  }
  Object.assign(product, req.body);
  return responseHandler.ok(res, product, "Product updated", null);
};

export const deleteProduct = (req: Request, res: Response) => {
  const index = products.findIndex((item) => item.id === req.params.id);
  const deleted = index !== -1;
  if (deleted) products.splice(index, 1);
  return responseHandler.ok(res, { deleted }, "Product deleted", null);
};

export const searchProducts = (req: Request, res: Response) => {
  const q = (req.query.q as string) || "";
  const data = products.filter((product) => product.name.toLowerCase().includes(q.toLowerCase()));
  return responseHandler.ok(res, data, "Products search results", null);
};

export const getProductByBarcode = (req: Request, res: Response) => {
  const product = products.find((item) => item.barcode === req.params.barcode);
  return responseHandler.ok(res, product ?? null, "Product by barcode retrieved", null);
};

export const getProductLocations = (req: Request, res: Response) => {
  const product = products.find((item) => item.id === req.params.id);
  return responseHandler.ok(res, product?.locations ?? [], "Product locations retrieved", null);
};
