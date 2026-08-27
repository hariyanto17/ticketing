import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { AppError } from "../../utils/errorHandler";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../../config/constant";
import { LoginInput } from "./validation";
import { JwtPayload } from "./interface";

export const authenticateUser = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    throw new AppError("UNAUTHORIZED", "Invalid username or password");
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError("UNAUTHORIZED", "Invalid username or password");
  }

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
    },
  };
};

export const ssoService = async (code: string) => {
  const platformApiUrl = process.env.PLATFORM_API_URL || process.env.PLATFORM_URL || "http://localhost:4000";

  const platformRes = await fetch(`${platformApiUrl}/api/applications/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, application: "TICKETING" }),
  });

  if (!platformRes.ok) {
    throw new AppError("UNAUTHORIZED", "SSO verification failed with Platform");
  }

  const envelope = (await platformRes.json()) as any;
  const platformUser = envelope.data;

  let user = await prisma.user.findUnique({
    where: { platformUserId: platformUser.id },
    include: { role: true },
  });

  const roleName = platformUser.application.role === "TICKETING_ADMINISTRATOR" ? "Admin" : "Cashier";
  let role = (await prisma.role.findFirst({ where: { name: roleName } })) || (await prisma.role.findFirst());
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
        status: "ACTIVE",
      },
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

  const payload: JwtPayload = {
    userId: user.id,
    role: user.role.name,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
    },
  };
};

export const ssoSyncService = async (platformUserId: string, status?: string, role?: string | null) => {
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

  return true;
};
