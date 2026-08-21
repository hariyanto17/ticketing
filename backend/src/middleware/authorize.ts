import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Authentication required"));
    }

    const hasRole = allowedRoles.some(
      (role) => role.toLowerCase() === req.user?.role.toLowerCase()
    );

    if (!hasRole) {
      return next(new AppError("FORBIDDEN", "You do not have permission to access this resource"));
    }

    next();
  };
};
