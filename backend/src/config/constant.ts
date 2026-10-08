import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5011;
export const JWT_SECRET = process.env.JWT_SECRET?.trim() || "";
export const JWT_EXPIRES_IN = "24h";
export const COOKIE_NAME = "token";
export const NODE_ENV = process.env.NODE_ENV || "development";

export const MIDTRANS_MERCHANT_ID = process.env.MIDTRANS_MERCHANT_ID || "";
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "";
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "";
export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";
export const MIDTRANS_SNAP_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://app.midtrans.com/snap/v1"
  : "https://app.sandbox.midtrans.com/snap/v1";
export const MIDTRANS_API_BASE_URL = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com/v2"
  : "https://api.sandbox.midtrans.com/v2";

export const PLATFORM_URL = process.env.PLATFORM_URL || "http://127.0.0.1:4000";
export const PLATFORM_INTERNAL_API_KEY = process.env.PLATFORM_INTERNAL_API_KEY?.trim() || "";

export const assertRequiredSecurityConfig = () => {
  if (
    PLATFORM_INTERNAL_API_KEY.length < 32 ||
    PLATFORM_INTERNAL_API_KEY === "platform-internal-secret-key-123" ||
    PLATFORM_INTERNAL_API_KEY === "sec_internal_planet_cinema_uat_key_99x"
  ) {
    throw new Error("PLATFORM_INTERNAL_API_KEY must be a unique secret of at least 32 characters");
  }

  if (
    JWT_SECRET.length < 32 ||
    JWT_SECRET === "super-secret-jwt-key-for-pos-mvp-12345"
  ) {
    throw new Error("JWT_SECRET must be uniquely configured with at least 32 characters");
  }

  if (NODE_ENV === "production" && !MIDTRANS_SERVER_KEY) {
    throw new Error("MIDTRANS_SERVER_KEY must be configured in production");
  }

  if (NODE_ENV === "production" && MIDTRANS_SERVER_KEY === "SB-Mid-server-YOUR_SERVER_KEY") {
    throw new Error("MIDTRANS_SERVER_KEY must not use the example placeholder in production");
  }
};
