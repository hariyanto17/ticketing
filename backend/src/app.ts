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

dotenv.config();

const app = express();
const server = createServer(app);

// Boot Socket.IO
initSocket(server);

app.use(cors({ origin: true, credentials: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/api", routes);
import internalRouter from "./routes/internal";
app.use("/api/internal", internalRouter);

app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
