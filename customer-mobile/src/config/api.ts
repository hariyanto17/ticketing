import { Platform } from "react-native";

export type Environment = "development" | "staging" | "production";

export const APP_ENV: Environment = (process.env.APP_ENV as Environment) || "development";

const getHostUrl = () => {
  if (APP_ENV === "production") {
    return "https://cinema.planetcinema.id";
  }
  if (APP_ENV === "staging") {
    return "https://staging-cinema.planetcinema.id";
  }
  // Development local environment resolution
  return Platform.OS === "android" ? "http://10.0.2.2:5011" : "http://localhost:5011";
};

export const API_BASE_URL = `${getHostUrl()}/api`;
export const SOCKET_URL = getHostUrl();

// Public Midtrans Client Key (Safe for client-side embedding)
// NOTE: MIDTRANS_SERVER_KEY is strictly maintained on the backend and NEVER exposed to mobile.
export const MIDTRANS_CLIENT_KEY = process.env.MIDTRANS_CLIENT_KEY || "SB-Mid-client-eiZoROEOouoxM1ro";
export const MIDTRANS_SNAP_BASE_URL = APP_ENV === "production"
  ? "https://app.midtrans.com/snap/v2/vtweb"
  : "https://app.sandbox.midtrans.com/snap/v2/vtweb";
