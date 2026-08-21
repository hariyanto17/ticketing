import { Request, Response } from "express";
import { createUserSchema, updateUserSchema } from "./validation";
import * as userService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getUsersController = async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  return responseHandler.ok(res, users, "Users retrieved");
};

export const getUserByIdController = async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.id);
  return responseHandler.ok(res, user, "User retrieved");
};

export const createUserController = async (req: Request, res: Response) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => e.message).join(", ");
    throw new AppError("BAD_REQUEST", errorMsg);
  }

  const user = await userService.createUser(result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "USER",
      action: "CREATE",
      newData: user,
    });
  }

  return responseHandler.created(res, user, "User created successfully");
};

export const updateUserController = async (req: Request, res: Response) => {
  const result = updateUserSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => e.message).join(", ");
    throw new AppError("BAD_REQUEST", errorMsg);
  }

  const oldUser = await userService.getUserById(req.params.id);
  const updatedUser = await userService.updateUser(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "USER",
      action: "UPDATE",
      oldData: oldUser,
      newData: updatedUser,
    });
  }

  return responseHandler.ok(res, updatedUser, "User updated successfully");
};

export const deleteUserController = async (req: Request, res: Response) => {
  const oldUser = await userService.getUserById(req.params.id);
  await userService.deleteUserSoft(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "USER",
      action: "DELETE",
      oldData: oldUser,
    });
  }

  return responseHandler.ok(res, null, "User soft-deleted successfully");
};
