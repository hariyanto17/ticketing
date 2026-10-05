import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { loginSchema } from "./validation";
import { authenticateUser, ssoService, ssoSyncService } from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { COOKIE_NAME, NODE_ENV, JWT_SECRET } from "../../config/constant";
import { AppError } from "../../utils/errorHandler";
import { prisma } from "../../utils/prisma";

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
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  return responseHandler.ok(res, { user, token }, "Login successful");
};

export const logoutController = async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] || req.headers["authorization"]?.toString().replace("Bearer ", "");
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      if (decoded?.userId) {
        const activeDrawer = await prisma.cashDrawer.findFirst({
          where: {
            openedById: decoded.userId,
            status: "OPEN",
          },
        });

        if (activeDrawer) {
          throw new AppError(
            "BAD_REQUEST",
            "Anda masih memiliki sesi laci kas (Cash Drawer) yang aktif. Silakan tutup sesi laci kas terlebih dahulu sebelum logout."
          );
        }
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      // If token invalid, proceed with clearing cookie
    }
  }

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return responseHandler.ok(res, null, "Logout successful");
};

export const meController = async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    throw new AppError("UNAUTHORIZED", "Not authenticated");
  }
  return responseHandler.ok(res, { user }, "User session retrieved");
};

export const ssoController = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    throw new AppError("BAD_REQUEST", "SSO exchange code is required");
  }

  const { token, user } = await ssoService(code);

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 24 * 60 * 60 * 1000,
  });

  return responseHandler.ok(res, { user, token }, "SSO Login successful");
};

export const ssoSyncController = async (req: Request, res: Response) => {
  const { platformUserId, status, role } = req.body;
  if (!platformUserId) {
    throw new AppError("BAD_REQUEST", "platformUserId is required");
  }

  await ssoSyncService(platformUserId, status, role);
  return responseHandler.ok(res, null, "User synced successfully");
};

// Aliases for compatibility
export const login = loginController;
export const logout = logoutController;
export const me = meController;
export const sso = ssoController;
export const ssoSync = ssoSyncController;
