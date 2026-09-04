import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errorHandler";

const normalizeRole = (role: string): string => {
  const r = (role || "").toUpperCase().replace(/[_\s-]/g, "");
  if (r.includes("ADMIN")) return "ADMIN";
  if (r.includes("CASHIER") || r.includes("KASIR")) return "CASHIER";
  if (r.includes("GATE") || r.includes("KIOSK") || r.includes("VALIDATOR")) return "GATE_VALIDATOR";
  return r;
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("UNAUTHORIZED", "Authentication required"));
    }

    const userRoleNorm = normalizeRole(req.user.role || "");

    const hasRole = allowedRoles.some((role) => {
      const allowedNorm = normalizeRole(role);
      return allowedNorm === userRoleNorm || role.toLowerCase() === req.user?.role?.toLowerCase();
    });

    if (!hasRole) {
      return next(new AppError("FORBIDDEN", "You do not have permission to access this resource"));
    }

    next();
  };
};
