import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5011;
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-for-pos-mvp-12345";
export const JWT_EXPIRES_IN = "24h";
export const COOKIE_NAME = "token";
export const NODE_ENV = process.env.NODE_ENV || "development";

export const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || "G092481675";
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-DC83UcaScN90Du2ch31U3RRc";
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "SB-Mid-client-eiZoROEOouoxM1ro";
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
export const MIDTRANS_SNAP_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";
export const MIDTRANS_API_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";
