import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { responseHandler } from "../utils/responseHandler";
import { AppError } from "../utils/errorHandler";

export const getBranches = async (req: Request, res: Response) => {
  const branches = await prisma.branch.findMany();
  return responseHandler.ok(res, branches, "Branches retrieved", null);
};

export const getBranchById = async (req: Request, res: Response) => {
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!branch) {
    throw new AppError("NOT_FOUND", "Branch not found");
  }
  return responseHandler.ok(res, branch, "Branch retrieved", null);
};

export const createBranch = async (req: Request, res: Response) => {
  const { name, code, address, city, province, phone, email, timezone, status } = req.body;
  if (!name || !code || !city || !province || !phone || !email || !timezone || !status) {
    throw new AppError("BAD_REQUEST", "Missing required fields");
  }

  const branch = await prisma.branch.create({
    data: {
      name,
      code,
      address,
      city,
      province,
      phone,
      email,
      timezone,
      status,
    },
  });
  return responseHandler.created(res, branch, "Branch created");
};

export const updateBranch = async (req: Request, res: Response) => {
  const { name, code, address, city, province, phone, email, timezone, status } = req.body;
  const branch = await prisma.branch.findUnique({ where: { id: req.params.id } });
  if (!branch) {
    throw new AppError("NOT_FOUND", "Branch not found");
  }

  const updatedBranch = await prisma.branch.update({
    where: { id: req.params.id },
    data: {
      name,
      code,
      address,
      city,
      province,
      phone,
      email,
      timezone,
      status,
    },
  });
  return responseHandler.ok(res, updatedBranch, "Branch updated", null);
};

export const deleteBranch = async (req: Request, res: Response) => {
  await prisma.branch.delete({ where: { id: req.params.id } });
  return responseHandler.ok(res, null, "Branch deleted", null);
};
