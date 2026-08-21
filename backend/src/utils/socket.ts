import { Server as HttpServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Seat reservation holds broadcast
    socket.on("hold_seats", (data: { showtimeId: string; seatIds: string[] }) => {
      socket.broadcast.emit("seats_held", data);
    });

    // Seat release broadcast
    socket.on("release_seats", (data: { showtimeId: string; seatIds: string[] }) => {
      socket.broadcast.emit("seats_released", data);
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIo = () => {
  return io;
};

export const emitSeatUpdate = (event: "seats_held" | "seats_released" | "seats_sold", data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
