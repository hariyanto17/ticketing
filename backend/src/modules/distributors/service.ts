import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateDistributorInput, UpdateDistributorInput } from "./validation";

export const getAllDistributors = async () => {
  return prisma.distributor.findMany({
    orderBy: { name: "asc" },
  });
};

export const getDistributorById = async (id: string) => {
  const dist = await prisma.distributor.findUnique({ where: { id } });
  if (!dist) throw new AppError("NOT_FOUND", "Distributor not found");
  return dist;
};

export const createDistributor = async (input: CreateDistributorInput) => {
  return prisma.distributor.create({
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

export const updateDistributor = async (id: string, input: UpdateDistributorInput) => {
  await getDistributorById(id);
  return prisma.distributor.update({
    where: { id },
    data: input,
  });
};

export const deleteDistributor = async (id: string) => {
  await getDistributorById(id);
  return prisma.distributor.delete({ where: { id } });
};
