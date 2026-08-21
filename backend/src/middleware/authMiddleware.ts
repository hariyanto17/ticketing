import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/errorHandler";
import { JWT_SECRET, COOKIE_NAME } from "../config/constant";

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.[COOKIE_NAME] || req.headers["authorization"]?.toString().replace("Bearer ", "");

  if (!token) {
    return next(new AppError("UNAUTHORIZED", "Authentication required"));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return next(new AppError("UNAUTHORIZED", "Invalid authentication token or account disabled"));
    }

    req.user = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
      branchId: user.branchId,
    };
    next();
  } catch (error) {
    return next(new AppError("UNAUTHORIZED", "Invalid authentication token"));
  }
};
