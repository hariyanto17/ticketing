import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import routes from "./routes";
import { errorHandler } from "./utils/errorHandler";
import { initSocket } from "./utils/socket";
import { PORT } from "./config/constant";
import internalRouter from "./modules/internal/router";
import { initMovieScheduler } from "./modules/movies/movieScheduler";
import { initCleanupScheduler } from "./modules/cleanup/cleanupScheduler";

import path from "path";

dotenv.config();

const app = express();
const server = createServer(app);

// Boot Socket.IO
initSocket(server);

// Boot Cron Schedulers
initMovieScheduler();
initCleanupScheduler();

app.use(
  cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads serving (for OTA bundles and assets)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.use("/api", routes);
app.use("/api/internal", internalRouter);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
