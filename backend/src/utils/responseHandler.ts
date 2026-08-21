import { Response } from "express";

export interface ResponseEnvelope<T, M = null> {
  status: "success" | "error";
  message: string;
  data: T;
  meta?: M | null;
}

export const responseHandler = {
  ok<T, M = null>(res: Response, data: T, message = "success", meta: M | null = null) {
    return res.status(200).json({
      status: "success",
      message,
      data,
      meta,
    } as ResponseEnvelope<T, M>);
  },

  created<T>(res: Response, data: T, message = "created") {
    return res.status(201).json({
      status: "success",
      message,
      data,
    } as ResponseEnvelope<T>);
  },
};
