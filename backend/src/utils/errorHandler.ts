import { ErrorRequestHandler, NextFunction, Request, Response } from "express";

export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR"
  | "TOO_MANY_REQUESTS"
  | "SERVICE_UNAVAILABLE"
  | "LOCATION_TRANSFER_CROSS_WAREHOUSE_NOT_ALLOWED";

export const ERROR_CODE: Record<ErrorCode, { code: string; httpStatus: number; message: string }> = {
  BAD_REQUEST: { code: "BAD_REQUEST", httpStatus: 400, message: "Bad Request" },
  UNAUTHORIZED: { code: "UNAUTHORIZED", httpStatus: 401, message: "Unauthorized" },
  FORBIDDEN: { code: "FORBIDDEN", httpStatus: 403, message: "Forbidden" },
  NOT_FOUND: { code: "NOT_FOUND", httpStatus: 404, message: "Not Found" },
  METHOD_NOT_ALLOWED: { code: "METHOD_NOT_ALLOWED", httpStatus: 405, message: "Method Not Allowed" },
  CONFLICT: { code: "CONFLICT", httpStatus: 409, message: "Conflict" },
  INTERNAL_SERVER_ERROR: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, message: "Internal Server Error" },
  TOO_MANY_REQUESTS: { code: "TOO_MANY_REQUESTS", httpStatus: 429, message: "Too Many Requests" },
  SERVICE_UNAVAILABLE: { code: "SERVICE_UNAVAILABLE", httpStatus: 503, message: "Service Unavailable" },
  LOCATION_TRANSFER_CROSS_WAREHOUSE_NOT_ALLOWED: { code: "LOCATION_TRANSFER_CROSS_WAREHOUSE_NOT_ALLOWED", httpStatus: 400, message: "Inter-warehouse moves are not allowed. Movements must occur within the same warehouse." },
};

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly httpStatus: number;

  constructor(errorCode: ErrorCode, message?: string) {
    super(ERROR_CODE[errorCode].message);
    this.message = message ?? ERROR_CODE[errorCode].message;
    this.code = ERROR_CODE[errorCode].code as ErrorCode;
    this.httpStatus = ERROR_CODE[errorCode].httpStatus;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.httpStatus).json({
      status: "error",
      code: err.code,
      message: err.message,
    });
  }

  if (
    err instanceof SyntaxError &&
    "status" in err &&
    (err as any).status === 400 &&
    "body" in err
  ) {
    return res.status(ERROR_CODE.BAD_REQUEST.httpStatus).json({
      status: "error",
      code: ERROR_CODE.BAD_REQUEST.code,
      message: "Invalid JSON format",
    });
  }

  return res.status(ERROR_CODE.INTERNAL_SERVER_ERROR.httpStatus).json({
    status: "error",
    code: ERROR_CODE.INTERNAL_SERVER_ERROR.code,
    message: err?.message || ERROR_CODE.INTERNAL_SERVER_ERROR.message,
  });
};
