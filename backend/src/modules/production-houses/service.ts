import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreatePHInput, UpdatePHInput } from "./validation";

export const getAllPHs = async () => {
  return prisma.productionHouse.findMany({
    orderBy: { name: "asc" },
  });
};

export const getPHById = async (id: string) => {
  const ph = await prisma.productionHouse.findUnique({ where: { id } });
  if (!ph) throw new AppError("NOT_FOUND", "Production House not found");
  return ph;
};

export const createPH = async (input: CreatePHInput) => {
  return prisma.productionHouse.create({
    data: {
      name: input.name,
      contactPerson: input.contactPerson,
      phone: input.phone,
      email: input.email,
      address: input.address,
      isActive: input.isActive ?? true,
    },
  });
};

export const updatePH = async (id: string, input: UpdatePHInput) => {
  await getPHById(id);
  return prisma.productionHouse.update({
    where: { id },
    data: input,
  });
};

export const deletePH = async (id: string) => {
  await getPHById(id);
  return prisma.productionHouse.delete({ where: { id } });
};
