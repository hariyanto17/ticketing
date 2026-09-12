import { Request, Response } from "express";
import * as service from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";

export const checkAppUpdateController = async (req: Request, res: Response) => {
  const { platform, appVersion, bundleVersion } = req.query;

  const result = await service.checkAppUpdate({
    platform: platform as string,
    appVersion: appVersion as string,
    bundleVersion: bundleVersion ? Number(bundleVersion) : undefined,
  });

  return responseHandler.ok(res, result, "App update status checked");
};

export const publishOtaReleaseController = async (req: Request, res: Response) => {
  const { platform, appVersion, bundleVersion, releaseNotes, isMandatory, bundleHash, binaryDownloadUrl } = req.body;

  if (!platform || !appVersion || !bundleVersion) {
    throw new AppError("BAD_REQUEST", "platform, appVersion, and bundleVersion are required");
  }

  const file = (req as any).file;

  const result = await service.publishOtaRelease({
    platform: platform.toLowerCase(),
    appVersion,
    bundleVersion: Number(bundleVersion),
    releaseNotes,
    isMandatory: isMandatory === "true" || isMandatory === true,
    bundleFileName: file ? file.filename : undefined,
    bundleBuffer: file ? file.buffer : undefined,
    bundleHash,
    binaryDownloadUrl,
  });

  return responseHandler.created(res, result, "OTA release published successfully");
};
