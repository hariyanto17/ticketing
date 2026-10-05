import bcrypt from "bcryptjs";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateUserInput, UpdateUserInput } from "./validation";

export const getAllUsers = async () => {
  return prisma.user.findMany({
    where: { isActive: true },
    include: {
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const getUserById = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
    include: {
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found or has been deleted");
  }

  return user;
};

export const createUser = async (input: CreateUserInput) => {
  // Check unique username
  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username },
  });
  if (existingUsername) {
    throw new AppError("CONFLICT", "Username is already taken");
  }

  // Check unique email
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingEmail) {
    throw new AppError("CONFLICT", "Email is already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);

  return prisma.user.create({
    data: {
      username: input.username,
      name: input.name,
      email: input.email,
      phone: input.phone,
      passwordHash,
      roleId: input.roleId,
      branchId: input.branchId,
      isActive: true,
      status: "ACTIVE",
    },
    include: {
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
};

export const updateUser = async (id: string, input: UpdateUserInput) => {
  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
  });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  // Check username collision
  if (input.username && input.username !== user.username) {
    const existing = await prisma.user.findUnique({ where: { username: input.username } });
    if (existing) {
      throw new AppError("CONFLICT", "Username is already taken");
    }
  }

  // Check email collision
  if (input.email && input.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("CONFLICT", "Email is already registered");
    }
  }

  const updateData: any = { ...input };
  delete updateData.password;

  if (input.password) {
    updateData.passwordHash = await bcrypt.hash(input.password, 10);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      role: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });
};

export const deleteUserSoft = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id, isActive: true },
  });
  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  // Soft delete: set isActive to false and status to INACTIVE/DELETED
  return prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      status: "DELETED",
    },
  });
};

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      roleId: true,
      branchId: true,
      isActive: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true, description: true } },
      branch: { select: { id: true, name: true, code: true, city: true, timezone: true } },
    },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User profile not found");
  }

  return user;
};

export const updateUserProfile = async (
  userId: string,
  input: {
    name?: string;
    phone?: string | null;
    currentPassword?: string | null;
    newPassword?: string | null;
    confirmPassword?: string | null;
  }
) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
  });

  if (!user) {
    throw new AppError("NOT_FOUND", "User not found");
  }

  const updateData: any = {};

  if (input.name && input.name.trim().length > 0) {
    updateData.name = input.name.trim();
  }

  if (input.phone !== undefined) {
    updateData.phone = input.phone ? input.phone.trim() : null;
  }

  // If user wants to change password
  if (input.newPassword && input.newPassword.trim().length > 0) {
    if (!input.currentPassword) {
      throw new AppError("BAD_REQUEST", "Password saat ini (lama) wajib diisi untuk mengubah password");
    }

    const isCurrentPasswordValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new AppError("BAD_REQUEST", "Password lama tidak sesuai");
    }

    updateData.passwordHash = await bcrypt.hash(input.newPassword, 10);
  }

  return prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      roleId: true,
      branchId: true,
      isActive: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true, description: true } },
      branch: { select: { id: true, name: true, code: true, city: true, timezone: true } },
    },
  });
};
