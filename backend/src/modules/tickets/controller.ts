import { Request, Response } from "express";
import { validateTicketSchema } from "./validation";
import * as ticketService from "./service";
import { responseHandler } from "../../utils/responseHandler";
import { AppError } from "../../utils/errorHandler";
import { logActivity } from "../../utils/activityLogger";

export const validateTicketController = async (req: Request, res: Response) => {
  const result = validateTicketSchema.safeParse(req.body);
  if (!result.success) {
    throw new AppError("BAD_REQUEST", result.error.issues.map((i) => i.message).join(", "));
  }

  const { status, ticket } = await ticketService.validateTicket(result.data.ticketNumber);

  if (req.user && status === "VALID" && ticket) {
    await logActivity({
      userId: req.user.id,
      module: "TICKET",
      action: "VALIDATE-ENTRY",
      newData: { ticketNumber: ticket.ticketNumber, id: ticket.id },
    });
  }

  return responseHandler.ok(res, { status, ticket }, `Validation status: ${status}`);
};

export const reprintTicketController = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("UNAUTHORIZED", "User must be authenticated");

  const { reason } = req.body;
  if (!reason || typeof reason !== "string") {
    throw new AppError("BAD_REQUEST", "Reprint reason is required");
  }

  const log = await ticketService.reprintTicket(req.params.id, req.user.id, reason);

  await logActivity({
    userId: req.user.id,
    module: "TICKET",
    action: "REPRINT",
    newData: { ticketId: log.ticketId, reason, logId: log.id },
  });

  return responseHandler.ok(res, log, "Ticket reprint logged successfully");
};
