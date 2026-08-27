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

    // Platform Session Revalidation
    if (user.platformUserId) {
      try {
        const platformApiUrl = process.env.PLATFORM_API_URL || process.env.PLATFORM_URL || "http://localhost:4000";
        const apiKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

        const platformRes = await fetch(
          `${platformApiUrl}/api/applications/users/${user.platformUserId}/context?application=TICKETING`,
          {
            headers: {
              "x-platform-internal-key": apiKey,
            },
            signal: AbortSignal.timeout(2000),
          }
        );

        if (platformRes.status === 401 || platformRes.status === 403) {
          await prisma.user.update({
            where: { id: user.id },
            data: { isActive: false },
          });
          return next(new AppError("UNAUTHORIZED", "Your access to this application is no longer available."));
        } else if (platformRes.status === 404) {
          return next(new AppError("UNAUTHORIZED", "User no longer exists on Platform"));
        } else if (platformRes.status >= 500) {
          return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification server error"));
        } else if (platformRes.ok) {
          const envelope = await platformRes.json() as any;
          const platformContext = envelope.data;

          if (platformContext.status !== "ACTIVE") {
            await prisma.user.update({
              where: { id: user.id },
              data: { isActive: false },
            });
            return next(new AppError("UNAUTHORIZED", "Your account is disabled on Platform"));
          }

          // Strict Role Validation
          const roleCode = platformContext.application.role;
          if (roleCode !== "TICKETING_ADMINISTRATOR" && roleCode !== "TICKETING_CASHIER") {
            return next(new AppError("FORBIDDEN", "Access denied: invalid role configuration"));
          }

          // Sync role changes if any
          const roleName = roleCode === "TICKETING_ADMINISTRATOR" ? "Admin" : "Cashier";
          if (user.role.name !== roleName) {
            const dbRole = await prisma.role.findFirst({ where: { name: roleName } });
            if (dbRole) {
              await prisma.user.update({
                where: { id: user.id },
                data: { roleId: dbRole.id },
              });
              user.role = dbRole;
            }
          }
        } else {
          return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification failed"));
        }
      } catch (err) {
        console.error("Platform revalidation temporarily unavailable", err);
        return next(new AppError("SERVICE_UNAVAILABLE", "Platform identity verification service is unavailable"));
      }
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
