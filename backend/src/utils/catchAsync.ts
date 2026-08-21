import { Request, Response, NextFunction, RequestHandler } from "express";

export const catchAsync = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error: Error) => {
      console.error("Error caught in catchAsync:", error);
      console.log("request body =>", req.body);
      next(error);
    });
  };
};
