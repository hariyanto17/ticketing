import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { responseHandler } from "../utils/responseHandler";
import { AppError } from "../utils/errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key";
const COOKIE_NAME = "token";

function signToken(payload: { userId: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError("BAD_REQUEST", "Username and password are required");
  }

  const user = await prisma.user.findUnique({
    where: { username },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("UNAUTHORIZED", "Invalid credentials");
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AppError("UNAUTHORIZED", "Invalid credentials");
  }

  const token = signToken({ userId: user.id, role: user.role.name });
  const expires = 60 * 60 * 1000;

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: expires,
  });

  return responseHandler.ok(
    res,
    {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role.name,
        isActive: user.isActive,
      },
    },
    "Login successful",
    null,
  );
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return responseHandler.ok(res, null, "Logout successful", null);
};

export const me = async (req: Request, res: Response) => {
  const user = (req as any).user;
  return responseHandler.ok(res, user, "Profile retrieved", null);
};
