import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";

export const getActiveDrawer = async (userId: string) => {
  return prisma.cashDrawer.findFirst({
    where: {
      openedById: userId,
      status: "OPEN",
    },
  });
};

export const openCashDrawer = async (userId: string, openingBalance: number) => {
  const active = await getActiveDrawer(userId);
  if (active) {
    throw new AppError("BAD_REQUEST", "You already have an active open cash drawer session");
  }

  return prisma.cashDrawer.create({
    data: {
      openingBalance,
      openedById: userId,
      status: "OPEN",
    },
  });
};

export const closeCashDrawer = async (userId: string, actualBalance: number) => {
  const drawer = await getActiveDrawer(userId);
  if (!drawer) {
    throw new AppError("NOT_FOUND", "No active open cash drawer session found for you");
  }

  // Calculate expectedBalance
  // expectedBalance = openingBalance + total CASH orders
  const orders = await prisma.order.findMany({
    where: {
      cashierId: userId,
      paymentMethod: "CASH",
      orderStatus: "PAID",
      createdAt: {
        gte: drawer.openedAt,
      },
    },
  });

  const totalCashSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const expectedBalance = drawer.openingBalance + totalCashSales;
  const difference = actualBalance - expectedBalance;

  return prisma.cashDrawer.update({
    where: { id: drawer.id },
    data: {
      closingBalance: actualBalance,
      expectedBalance,
      actualBalance,
      difference,
      closedById: userId,
      closedAt: new Date(),
      status: "CLOSED",
    },
  });
};

export const getDrawersHistory = async () => {
  return prisma.cashDrawer.findMany({
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
    orderBy: { openedAt: "desc" },
  });
};
