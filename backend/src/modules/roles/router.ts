import { Router, Request, Response } from "express";
import { prisma } from "../../utils/prisma";
import { responseHandler } from "../../utils/responseHandler";
import { catchAsync } from "../../utils/catchAsync";
import { authMiddleware } from "../../middleware/authMiddleware";

const router = Router();

router.use(catchAsync(authMiddleware));

router.get(
  "/",
  catchAsync(async (req: Request, res: Response) => {
    const roles = await prisma.role.findMany();
    return responseHandler.ok(res, roles, "Roles retrieved");
  })
);

export default router;
