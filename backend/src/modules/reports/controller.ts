import { Request, Response } from "express";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";

export const getReportsController = async (req: Request, res: Response) => {
  const reports = await service.getOperationalReports();
  return responseHandler.ok(res, reports, "Operational reports retrieved successfully");
};
