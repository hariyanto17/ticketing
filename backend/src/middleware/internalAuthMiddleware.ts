import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { AppError } from "../utils/errorHandler";
import { PLATFORM_INTERNAL_API_KEY } from "../config/constant";

export const internalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (!PLATFORM_INTERNAL_API_KEY) {
    return next(new AppError("SERVICE_UNAVAILABLE", "Internal service authentication is not configured"));
  }

  const apiKey = req.headers["x-platform-internal-key"]?.toString();
  let isMatch = false;
  if (apiKey) {
    const provided = Buffer.from(apiKey);
    const expected = Buffer.from(PLATFORM_INTERNAL_API_KEY);
    if (provided.length === expected.length) {
      isMatch = crypto.timingSafeEqual(provided, expected);
    }
  }

  if (!isMatch) {
    return next(new AppError("UNAUTHORIZED", "Invalid or missing internal service credential"));
  }

  next();
};
