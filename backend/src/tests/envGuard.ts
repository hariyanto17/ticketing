import dotenv from "dotenv";
dotenv.config();

/**
 * Strict Environment Guard for Tests
 * Prohibits test execution against production environment or database.
 */
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.APP_ENV === "production" ||
  (process.env.DATABASE_URL?.includes("5432/ticketing") && process.env.NODE_ENV !== "test");

if (isProduction && process.env.ALLOW_PRODUCTION_TESTS !== "true") {
  console.error("\n================================================================================");
  console.error("FATAL ERROR: DILARANG MENJALANKAN TEST DI ENVIRONMENT PRODUCTION!");
  console.error(`Detected NODE_ENV='${process.env.NODE_ENV}'. Database URL points to production.`);
  console.error("Menjalankan test di database production dapat merusak data operasional kasir.");
  console.error("Jalankan test hanya di database khusus (test/staging) dengan NODE_ENV=test.");
  console.error("================================================================================\n");
  process.exit(1);
}
