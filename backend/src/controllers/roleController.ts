import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { responseHandler } from "../utils/responseHandler";
import { AppError } from "../utils/errorHandler";

export const getRoles = async (req: Request, res: Response) => {
  const roles = await prisma.role.findMany();
  return responseHandler.ok(res, roles, "Roles retrieved", null);
};

export const getRoleById = async (req: Request, res: Response) => {
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) {
    throw new AppError("NOT_FOUND", "Role not found");
  }
  return responseHandler.ok(res, role, "Role retrieved", null);
};

export const createRole = async (req: Request, res: Response) => {
  const { name, description, status } = req.body;
  if (!name || !status) {
    throw new AppError("BAD_REQUEST", "Missing required fields");
  }

  const role = await prisma.role.create({
    data: {
      name,
      description,
      status,
    },
  });
  return responseHandler.created(res, role, "Role created");
};

export const updateRole = async (req: Request, res: Response) => {
  const { name, description, status } = req.body;
  const role = await prisma.role.findUnique({ where: { id: req.params.id } });
  if (!role) {
    throw new AppError("NOT_FOUND", "Role not found");
  }

  const updatedRole = await prisma.role.update({
    where: { id: req.params.id },
    data: {
      name,
      description,
      status,
    },
  });
  return responseHandler.ok(res, updatedRole, "Role updated", null);
};

export const deleteRole = async (req: Request, res: Response) => {
  await prisma.role.delete({ where: { id: req.params.id } });
  return responseHandler.ok(res, null, "Role deleted", null);
};
