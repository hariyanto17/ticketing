import dotenv from "dotenv";
dotenv.config();

export const PORT = process.env.PORT || 5011;
export const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-for-pos-mvp-12345";
export const JWT_EXPIRES_IN = "24h";
export const COOKIE_NAME = "token";
export const NODE_ENV = process.env.NODE_ENV || "development";
