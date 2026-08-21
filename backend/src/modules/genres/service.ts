import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/errorHandler";
import { CreateGenreInput, UpdateGenreInput } from "./validation";

export const getAllGenres = async () => {
  return prisma.genre.findMany({
    orderBy: { name: "asc" },
  });
};

export const getGenreById = async (id: string) => {
  const genre = await prisma.genre.findUnique({ where: { id } });
  if (!genre) throw new AppError("NOT_FOUND", "Genre not found");
  return genre;
};

export const createGenre = async (input: CreateGenreInput) => {
  const existing = await prisma.genre.findFirst({ where: { name: input.name } });
  if (existing) throw new AppError("CONFLICT", "Genre already exists");

  return prisma.genre.create({
    data: {
      name: input.name,
      description: input.description,
      isActive: input.isActive ?? true,
    },
  });
};

export const updateGenre = async (id: string, input: UpdateGenreInput) => {
  const genre = await getGenreById(id);

  if (input.name && input.name !== genre.name) {
    const existing = await prisma.genre.findFirst({ where: { name: input.name } });
    if (existing) throw new AppError("CONFLICT", "Genre name already taken");
  }

  return prisma.genre.update({
    where: { id },
    data: input,
  });
};

export const deleteGenre = async (id: string) => {
  await getGenreById(id);
  // Perform simple delete
  return prisma.genre.delete({ where: { id } });
};
