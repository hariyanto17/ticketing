import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Client } from "pg";

let io: Server | null = null;
let pgClient: Client | null = null;
let isPgConnecting = false;

/**
 * Initialize Socket.IO server
 */
export const initSocket = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: (_origin, callback) => callback(null, true),
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join showtime room for schedule-specific updates
    socket.on("join_showtime", (showtimeId: string) => {
      if (showtimeId) {
        socket.join(`showtime_${showtimeId}`);
        console.log(`📱 Client ${socket.id} joined showtime_${showtimeId}`);
      }
    });

    // Leave showtime room
    socket.on("leave_showtime", (showtimeId: string) => {
      if (showtimeId) {
        socket.leave(`showtime_${showtimeId}`);
        console.log(`📱 Client ${socket.id} left showtime_${showtimeId}`);
      }
    });

    // Client-initiated seat reservation holds broadcast
    socket.on("hold_seats", (data: { showtimeId: string; seatIds: string[] }) => {
      if (data?.showtimeId) {
        io?.to(`showtime_${data.showtimeId}`).emit("seats_held", data);
      }
      socket.broadcast.emit("seats_held", data);
    });

    // Client-initiated seat release broadcast
    socket.on("release_seats", (data: { showtimeId: string; seatIds: string[] }) => {
      if (data?.showtimeId) {
        io?.to(`showtime_${data.showtimeId}`).emit("seats_released", data);
      }
      socket.broadcast.emit("seats_released", data);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Initialize PostgreSQL LISTEN for automatic DB-driven realtime events
  initializePgListen();

  return io;
};

/**
 * Initialize PostgreSQL LISTEN connection and forward events to Socket.IO
 */
export const initializePgListen = async () => {
  if (isPgConnecting) return;
  isPgConnecting = true;

  try {
    const connectionString =
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@127.0.0.1:5432/ticketing?schema=public";

    // Clean connection string if it has prisma schema query params
    const cleanConnectionString = connectionString.split("?")[0];

    pgClient = new Client({
      connectionString: cleanConnectionString,
    });

    await pgClient.connect();
    console.log("🔌 [PostgreSQL LISTEN] Connected successfully to database");

    // Channels to listen to
    const channels = [
      "showtime_seat_event",
      "order_event",
      "payment_event",
      "showtime_event",
    ];

    for (const channel of channels) {
      await pgClient.query(`LISTEN ${channel}`);
      console.log(`📡 [PostgreSQL LISTEN] Listening on channel: ${channel}`);
    }

    pgClient.on("notification", (msg) => {
      try {
        const rawPayload = msg.payload ? JSON.parse(msg.payload) : {};
        const { action, table, data } = rawPayload;

        console.log(`🔔 [PostgreSQL Event] ${msg.channel} (${action})`);

        if (!io) return;

        switch (msg.channel) {
          case "showtime_seat_event": {
            if (data && data.showtimeId) {
              const seatUpdatePayload = {
                action,
                showtimeId: data.showtimeId,
                seatId: data.seatId,
                status: data.status,
                reservedUntil: data.reservedUntil,
                ticketId: data.ticketId,
                rawData: data,
              };

              // Emit generic seat update
              io.emit("seat_update", seatUpdatePayload);
              io.to(`showtime_${data.showtimeId}`).emit("seat_update", seatUpdatePayload);

              // Also emit specific event matching status for backward compatibility
              if (data.status === "AVAILABLE") {
                io.emit("seats_released", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                });
                io.to(`showtime_${data.showtimeId}`).emit("seats_released", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                });
              } else if (data.status === "HELD" || data.status === "RESERVED") {
                io.emit("seats_held", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                  reservedUntil: data.reservedUntil,
                });
                io.to(`showtime_${data.showtimeId}`).emit("seats_held", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                  reservedUntil: data.reservedUntil,
                });
              } else if (data.status === "SOLD" || data.status === "BOOKED" || data.status === "PAID") {
                io.emit("seats_sold", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                });
                io.to(`showtime_${data.showtimeId}`).emit("seats_sold", {
                  showtimeId: data.showtimeId,
                  seatIds: [data.seatId],
                });
              }
            }
            break;
          }

          case "order_event": {
            io.emit("order_event", rawPayload);
            io.emit("order_updated", data);
            if (action === "INSERT") {
              io.emit("order_created", data);
            }
            if (data?.scheduleId) {
              io.to(`showtime_${data.scheduleId}`).emit("order_updated", data);
            }
            break;
          }

          case "payment_event": {
            io.emit("payment_event", rawPayload);
            io.emit("payment_updated", data);
            if (data?.status === "PAID" || data?.status === "SETTLED") {
              io.emit("payment_success", data);
            }
            break;
          }

          case "showtime_event": {
            io.emit("showtime_event", rawPayload);
            io.emit("showtime_updated", data);
            break;
          }

          default:
            io.emit(msg.channel, rawPayload);
            break;
        }
      } catch (err) {
        console.error("❌ Error parsing PostgreSQL notification payload:", err);
      }
    });

    pgClient.on("error", (err) => {
      console.error("❌ [PostgreSQL LISTEN] Client error:", err);
      reconnectPgListen();
    });

    pgClient.on("end", () => {
      console.warn("⚠️ [PostgreSQL LISTEN] Connection ended");
      reconnectPgListen();
    });
  } catch (error) {
    console.error("❌ [PostgreSQL LISTEN] Failed to initialize:", error);
    reconnectPgListen();
  } finally {
    isPgConnecting = false;
  }
};

/**
 * Handle auto-reconnect for PostgreSQL LISTEN
 */
const reconnectPgListen = () => {
  if (pgClient) {
    try {
      pgClient.removeAllListeners();
      pgClient.end().catch(() => {});
    } catch {}
    pgClient = null;
  }

  setTimeout(() => {
    console.log("🔄 [PostgreSQL LISTEN] Attempting to reconnect...");
    initializePgListen();
  }, 5000);
};

export const getIo = () => {
  return io;
};

export const emitSeatUpdate = (
  event: "seats_held" | "seats_released" | "seats_sold",
  data: any
) => {
  if (io) {
    io.emit(event, data);
    if (data?.showtimeId) {
      io.to(`showtime_${data.showtimeId}`).emit(event, data);
    }
  }
};

export const emitToRoom = (room: string, event: string, data: any) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

export const emitToAll = (event: string, data: any) => {
  if (io) {
    io.emit(event, data);
  }
};
