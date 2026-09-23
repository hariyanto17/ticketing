import { Request, Response } from "express";
import { createPromotionSchema, updatePromotionSchema } from "./validation";
import * as promotionService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";
import { z } from "zod";

export const getPromotionsController = async (req: Request, res: Response) => {
  const result = await promotionService.getAllPromotions(req.query);
  return responseHandler.ok(res, result.promotions, "Promotions retrieved", result.meta);
};

export const getActivePromotionsController = async (req: Request, res: Response) => {
  const branchId = (req.query.branchId as string) || req.user?.branchId;
  const movieId = req.query.movieId as string | undefined;
  const promotions = await promotionService.getActivePromotions(branchId, movieId);
  return responseHandler.ok(res, promotions, "Active promotions retrieved");
};

export const getPromotionByIdController = async (req: Request, res: Response) => {
  const promotion = await promotionService.getPromotionById(req.params.id);
  return responseHandler.ok(res, promotion, "Promotion retrieved");
};

export const createPromotionController = async (req: Request, res: Response) => {
  const result = createPromotionSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const promotion = await promotionService.createPromotion(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PROMOTION",
      action: "CREATE",
      newData: promotion,
    });
  }

  return responseHandler.created(res, promotion, "Promotion created successfully");
};

export const updatePromotionController = async (req: Request, res: Response) => {
  const result = updatePromotionSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldPromo = await promotionService.getPromotionById(req.params.id);
  const updatedPromo = await promotionService.updatePromotion(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PROMOTION",
      action: "UPDATE",
      oldData: oldPromo,
      newData: updatedPromo,
    });
  }

  return responseHandler.ok(res, updatedPromo, "Promotion updated successfully");
};

export const deletePromotionController = async (req: Request, res: Response) => {
  const oldPromo = await promotionService.getPromotionById(req.params.id);
  await promotionService.deletePromotion(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "PROMOTION",
      action: "DELETE",
      oldData: oldPromo,
    });
  }

  return responseHandler.ok(res, null, "Promotion deleted / deactivated successfully");
};

const calculatePromoSchema = z.object({
  promotionId: z.string().uuid("Invalid promotion ID"),
  ticketCount: z.number().int().positive("Ticket count must be at least 1"),
  ticketPrice: z.number().positive("Ticket price must be positive"),
  movieId: z.string().uuid().optional(),
});

export const calculatePromoPreviewController = async (req: Request, res: Response) => {
  const result = calculatePromoSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const promotion = await promotionService.getPromotionById(result.data.promotionId);
  const calculation = promotionService.calculatePromotionDiscount(
    promotion,
    result.data.ticketCount,
    result.data.ticketPrice,
    result.data.movieId
  );

  return responseHandler.ok(res, calculation, "Promotion preview calculated successfully");
};
