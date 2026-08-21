import { User, Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        name: string;
        email: string;
        role: string;
        isActive: boolean;
        branchId: string;
      };
    }
  }
}
