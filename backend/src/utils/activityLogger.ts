import { prisma } from "./prisma";

interface LogActivityParams {
  userId: string;
  module: string;
  action: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
}

export const logActivity = async ({
  userId,
  module,
  action,
  oldData,
  newData,
  ipAddress = "127.0.0.1",
}: LogActivityParams) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        module,
        action,
        oldData: oldData ? JSON.stringify(oldData) : null,
        newData: newData ? JSON.stringify(newData) : null,
        ipAddress,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
};
