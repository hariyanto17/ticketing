import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../utils/prisma";
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
