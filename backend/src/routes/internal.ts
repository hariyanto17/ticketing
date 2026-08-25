import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/errorHandler";
import { catchAsync } from "../utils/catchAsync";
import crypto from "crypto";

const router = Router();

const authenticateInternal = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-platform-internal-key"]?.toString();
  const expectedKey = process.env.PLATFORM_INTERNAL_API_KEY || "platform-internal-secret-key-123";

  let isMatch = false;
  if (apiKey) {
    const aBuf = Buffer.from(apiKey);
    const bBuf = Buffer.from(expectedKey);
    if (aBuf.length === bBuf.length) {
      isMatch = crypto.timingSafeEqual(aBuf, bBuf);
    }
  }

  if (!isMatch) {
    return next(new AppError("UNAUTHORIZED", "Invalid or missing internal service credential"));
  }

  next();
};

router.use(authenticateInternal);

router.get("/summary", catchAsync(async (req: Request, res: Response) => {
  const dateStr = req.query.date ? req.query.date.toString() : new Date().toISOString().split("T")[0];
  const start = new Date(dateStr);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(dateStr);
  end.setUTCHours(23, 59, 59, 999);

  const [orders, ticketsCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        orderStatus: "PAID",
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
      },
    }),
    prisma.ticket.count({
      where: {
        order: {
          orderStatus: "PAID",
          createdAt: { gte: start, lte: end },
        },
        status: { in: ["ACTIVE", "USED"] },
      },
    }),
  ]);

  const transactions = orders.length;
  const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const averageTransaction = transactions > 0 ? revenue / transactions : 0;

  res.status(200).json({
    status: "success",
    message: "Ticketing operational summary retrieved successfully",
    data: {
      revenue,
      transactions,
      ticketsSold: ticketsCount,
      averageTransaction,
    },
  });
}));

export default router;
