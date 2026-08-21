import { Request, Response } from "express";
import { loginSchema } from "./validation";
import { authenticateUser } from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { COOKIE_NAME, NODE_ENV } from "../../config/constant";
import { AppError } from "../../utils/errorHandler";

export const loginController = async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => e.message).join(", ");
    throw new AppError("BAD_REQUEST", errorMsg);
  }

  const { token, user } = await authenticateUser(result.data);

  // Set httpOnly cookie
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  return responseHandler.ok(res, { user, token }, "Login successful");
};

export const logoutController = async (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "strict",
  });
  return responseHandler.ok(res, null, "Logout successful");
};

export const meController = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  return responseHandler.ok(res, { user: req.user }, "User session retrieved");
};
