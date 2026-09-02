import { z } from "zod";

export const midtransNotificationSchema = z.object({
  transaction_time: z.string().optional(),
  transaction_status: z.string(),
  transaction_id: z.string(),
  status_message: z.string().optional(),
  status_code: z.string(),
  signature_key: z.string(),
  payment_type: z.string().optional(),
  order_id: z.string(),
  merchant_id: z.string().optional(),
  gross_amount: z.string(),
  fraud_status: z.string().optional(),
  currency: z.string().optional(),
  settlement_time: z.string().optional(),
  expiry_time: z.string().optional(),
});

export type MidtransNotificationInput = z.infer<typeof midtransNotificationSchema>;
