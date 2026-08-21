import { Request, Response } from "express";
import { createDistributorSchema, updateDistributorSchema } from "./validation";
import * as distService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const getDistributorsController = async (req: Request, res: Response) => {
  const dists = await distService.getAllDistributors();
  return responseHandler.ok(res, dists, "Distributors retrieved");
};

export const getDistributorByIdController = async (req: Request, res: Response) => {
  const dist = await distService.getDistributorById(req.params.id);
  return responseHandler.ok(res, dist, "Distributor retrieved");
};

export const createDistributorController = async (req: Request, res: Response) => {
  const result = createDistributorSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const dist = await distService.createDistributor(result.data);
  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "DISTRIBUTOR",
      action: "CREATE",
      newData: dist,
    });
  }

  return responseHandler.created(res, dist, "Distributor created");
};

export const updateDistributorController = async (req: Request, res: Response) => {
  const result = updateDistributorSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const oldDist = await distService.getDistributorById(req.params.id);
  const dist = await distService.updateDistributor(req.params.id, result.data);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "DISTRIBUTOR",
      action: "UPDATE",
      oldData: oldDist,
      newData: dist,
    });
  }

  return responseHandler.ok(res, dist, "Distributor updated");
};

export const deleteDistributorController = async (req: Request, res: Response) => {
  const oldDist = await distService.getDistributorById(req.params.id);
  await distService.deleteDistributor(req.params.id);

  if (req.user) {
    await logActivity({
      userId: req.user.id,
      module: "DISTRIBUTOR",
      action: "DELETE",
      oldData: oldDist,
    });
  }

  return responseHandler.ok(res, null, "Distributor deleted");
};
