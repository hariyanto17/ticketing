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

export const closeCashDrawer = async (userId: string, actualBalance: number, notes?: string | null) => {
  const drawer = await getActiveDrawer(userId);
  if (!drawer) {
    throw new AppError("NOT_FOUND", "No active open cash drawer session found for you");
  }

  // Calculate sales per payment method during this active drawer session
  const orders = await prisma.order.findMany({
    where: {
      cashierId: userId,
      orderStatus: "PAID",
      createdAt: {
        gte: drawer.openedAt,
      },
    },
  });

  const totalCashSales = orders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalQrisSales = orders
    .filter((o) => o.paymentMethod === "QRIS")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalOtherSales = orders
    .filter((o) => o.paymentMethod !== "CASH" && o.paymentMethod !== "QRIS")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalSales = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalTransactions = orders.length;

  const expectedBalance = drawer.openingBalance + totalCashSales;
  const difference = actualBalance - expectedBalance;

  const updatedDrawer = await prisma.cashDrawer.update({
    where: { id: drawer.id },
    data: {
      closingBalance: actualBalance,
      expectedBalance,
      actualBalance,
      difference,
      notes: notes?.trim() || null,
      closedById: userId,
      closedAt: new Date(),
      status: "CLOSED",
    },
    include: {
      openedBy: { select: { id: true, name: true } },
      closedBy: { select: { id: true, name: true } },
    },
  });

  return {
    ...updatedDrawer,
    totalCashSales,
    totalQrisSales,
    totalOtherSales,
    totalSales,
    totalTransactions,
  };
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
