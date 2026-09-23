import { z } from "zod";

export const createPromotionSchema = z.object({
  name: z.string().min(1, "Nama promo wajib diisi"),
  code: z.string().trim().toUpperCase().optional().nullable(),
  promoType: z.enum(["BUY_X_GET_Y", "PERCENTAGE"]),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  buyQty: z.number().int().positive().optional().nullable(),
  getQty: z.number().int().positive().optional().nullable(),
  quota: z.number().int().positive("Kuota harus lebih besar dari 0"),
  minTickets: z.number().int().positive().optional().default(1),
  maxUsagePerOrder: z.number().int().positive().optional().nullable(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal mulai tidak valid",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal expired tidak valid",
  }),
  isActive: z.boolean().optional().default(true),
  branchId: z.string().uuid().optional().nullable(),
  movieIds: z.array(z.string().uuid("Invalid movie ID")).optional().default([]),
}).refine(
  (data) => {
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: "Tanggal expired harus sama atau setelah tanggal mulai",
    path: ["endDate"],
  }
).refine(
  (data) => {
    if (data.promoType === "PERCENTAGE") {
      return data.discountPercent !== undefined && data.discountPercent !== null && data.discountPercent > 0;
    }
    return true;
  },
  {
    message: "Persentase diskon wajib diisi untuk tipe PERCENTAGE",
    path: ["discountPercent"],
  }
).refine(
  (data) => {
    if (data.promoType === "BUY_X_GET_Y") {
      return (data.buyQty ?? 1) >= 1 && (data.getQty ?? 1) >= 1;
    }
    return true;
  },
  {
    message: "Buy Qty dan Get Qty wajib minimal 1 untuk promo BOGO",
    path: ["buyQty"],
  }
);

export type CreatePromotionInput = z.input<typeof createPromotionSchema>;

export const updatePromotionSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().trim().toUpperCase().optional().nullable(),
  promoType: z.enum(["BUY_X_GET_Y", "PERCENTAGE"]).optional(),
  discountPercent: z.number().min(0).max(100).optional().nullable(),
  maxDiscount: z.number().nonnegative().optional().nullable(),
  buyQty: z.number().int().positive().optional().nullable(),
  getQty: z.number().int().positive().optional().nullable(),
  quota: z.number().int().positive().optional(),
  minTickets: z.number().int().positive().optional(),
  maxUsagePerOrder: z.number().int().positive().optional().nullable(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val))).optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().uuid().optional().nullable(),
  movieIds: z.array(z.string().uuid("Invalid movie ID")).optional(),
});

export type UpdatePromotionInput = z.input<typeof updatePromotionSchema>;
