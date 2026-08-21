import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { responseHandler } from "../utils/responseHandler";
import { AppError } from "../utils/errorHandler";

export const getUsers = async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: { role: true, branch: true },
  });
  return responseHandler.ok(res, users, "Users retrieved", null);
};

export const getUserById = async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: { role: true, branch: true },
  });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }
  return responseHandler.ok(res, user, "User retrieved", null);
};

export const createUser = async (req: Request, res: Response) => {
  const { username, name, email, password, roleId, branchId, phone } = req.body;
  if (!username || !name || !email || !password || !roleId || !branchId) {
    throw new AppError("BAD_REQUEST", "Missing required fields");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      name,
      email,
      phone,
      passwordHash,
      branchId,
      roleId,
      status: "ACTIVE",
      isActive: true,
    },
    include: { role: true, branch: true },
  });
  return responseHandler.created(res, user, "User created");
};

export const updateUser = async (req: Request, res: Response) => {
  const { username, name, email, password, roleId, branchId, phone, isActive, status } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const data: any = {
    username,
    name,
    email,
    phone,
    branchId,
    roleId,
    isActive,
    status,
  };

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.params.id },
    data,
    include: { role: true, branch: true },
  });
  return responseHandler.ok(res, updatedUser, "User updated", null);
};

export const deleteUser = async (req: Request, res: Response) => {
  await prisma.user.delete({ where: { id: req.params.id } });
  return responseHandler.ok(res, null, "User deleted", null);
};
