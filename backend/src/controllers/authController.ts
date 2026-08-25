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

export const sso = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) {
    throw new AppError("BAD_REQUEST", "SSO exchange code is required");
  }

  const platformApiUrl = process.env.PLATFORM_API_URL || "http://localhost:5000";
  
  const platformRes = await fetch(`${platformApiUrl}/api/applications/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, application: "TICKETING" }),
  });

  if (!platformRes.ok) {
    throw new AppError("UNAUTHORIZED", "SSO verification failed with Platform");
  }

  const envelope = await platformRes.json() as any;
  const platformUser = envelope.data;

  let user = await prisma.user.findUnique({
    where: { platformUserId: platformUser.id },
    include: { role: true },
  });

  const roleName = platformUser.application.role === "TICKETING_ADMINISTRATOR" ? "Admin" : "Cashier";
  let role = await prisma.role.findFirst({ where: { name: roleName } }) || await prisma.role.findFirst();
  if (!role) {
    throw new AppError("INTERNAL_SERVER_ERROR", "No roles configured in Ticketing system");
  }

  let branch = await prisma.branch.findFirst();
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: "Default Branch",
        code: "DEFAULT",
        address: "Default Address",
        city: "Default City",
        province: "Default Province",
        phone: "0000000",
        email: "default@test.com",
        timezone: "Asia/Jakarta",
        status: "ACTIVE"
      }
    });
  }

  if (!user) {
    const baseUsername = platformUser.email.split("@")[0];
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix}`;
      suffix++;
    }

    user = await prisma.user.create({
      data: {
        platformUserId: platformUser.id,
        branchId: branch.id,
        roleId: role.id,
        username,
        name: platformUser.name,
        email: platformUser.email,
        passwordHash: "sso-managed-credentials",
        isActive: true,
        status: "ACTIVE",
      },
      include: { role: true },
    });
  } else {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: platformUser.name,
        roleId: role.id,
      },
      include: { role: true },
    });
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
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role.name,
        isActive: user.isActive,
      },
    },
    "SSO Login successful",
    null,
  );
};

export const ssoSync = async (req: Request, res: Response) => {
  const { platformUserId, status, role } = req.body;
  if (!platformUserId) {
    throw new AppError("BAD_REQUEST", "platformUserId is required");
  }

  const localUser = await prisma.user.findUnique({
    where: { platformUserId },
  });

  if (localUser) {
    const isActive = status === "ACTIVE" && role !== null;
    const data: any = { isActive };
    if (role) {
      const roleName = role === "TICKETING_ADMINISTRATOR" ? "Admin" : "Cashier";
      const dbRole = await prisma.role.findFirst({ where: { name: roleName } });
      if (dbRole) {
        data.roleId = dbRole.id;
      }
    }
    await prisma.user.update({
      where: { id: localUser.id },
      data,
    });
  }

  return responseHandler.ok(res, null, "User synced successfully", null);
};
