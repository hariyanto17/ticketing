import * as z from "zod";

export const movieFormSchema = (t: (key: string) => string) =>
  z.object({
    title: z.string().min(1, t("validation.titleRequired")),
    synopsis: z.string().optional().nullable(),
    durationMinutes: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z.number().int().positive(t("validation.durationPositive")).nullable().optional()
    ),
    censorshipRating: z.string().min(1, t("validation.censorshipRequired")),
    poster: z.string().optional().nullable(),
    trailerUrl: z.string().optional().nullable(),
    director: z.string().optional().nullable(),
    writer: z.string().optional().nullable(),
    producer: z.string().optional().nullable(),
    cast: z.string().optional().nullable(),
    status: z.enum(["DRAFT", "COMING_SOON", "NOW_SHOWING", "ENDED", "ARCHIVED"]),
    productionHouseId: z.string().uuid(t("validation.productionRequired")),
    distributorId: z.string().uuid(t("validation.distributorRequired")).optional().nullable(),
    genreIds: z.array(z.string().uuid()).min(1, t("validation.genreRequired")),
  });

export const genreFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    description: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
  });

export const orgFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z.string().min(1, t("validation.nameRequired")),
    contactPerson: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email(t("validation.emailInvalid")).optional().or(z.literal("")).nullable(),
    address: z.string().optional().nullable(),
    isActive: z.boolean().default(true),
  });
