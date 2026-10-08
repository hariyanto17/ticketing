import { Schedule, ShowtimeSeat } from "@/services/studioApi";
import { createPrinterAgentClient, getPrinterAgentDeviceId } from "@/services/printerAgentClient";

export async function printTicketsViaAgent({
  order,
  tickets,
  schedule,
  seatsToUse,
  toastSuccess,
  toastError,
}: {
  order: any;
  tickets: any[];
  schedule: Schedule;
  seatsToUse: ShowtimeSeat[];
  toastSuccess: (msg: string) => void;
  toastError: (msg: string) => void;
}): Promise<boolean> {
  if (!order || !schedule || !tickets?.length) {
    toastError("Data tiket belum tersedia untuk dicetak.");
    return false;
  }

  if (!getPrinterAgentDeviceId()) {
    toastError("Printer agent belum terhubung ke perangkat ini.");
    return false;
  }

  try {
    const client = createPrinterAgentClient();
    const startTime = new Date(schedule.startTime).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const showDate = new Date(schedule.businessDate).toLocaleDateString("en-CA");
    const price = order.totalAmount / tickets.length;

    for (let idx = 0; idx < tickets.length; idx++) {
      const ticket = tickets[idx];
      const seatObj =
        ticket.showtimeSeat?.seat ||
        seatsToUse.find((s) => s.id === ticket.showtimeSeatId || s.seatId === ticket.showtimeSeatId)?.seat ||
        seatsToUse[idx]?.seat;

      await client.printTicket({
        mode: "print",
        ticketNumber: ticket.ticketNumber,
        orderNumber: order.orderNumber,
        movie: schedule.movie.title,
        studio: schedule.studio.name,
        showDate,
        showTime: startTime,
        seat: seatObj?.seatLabel || ticket.showtimeSeat?.seat?.seatLabel || "-",
        row: seatObj?.row || ticket.showtimeSeat?.seat?.row || "-",
        seatNumber: seatObj?.seatNumber ?? ticket.showtimeSeat?.seat?.seatNumber,
        price,
        totalAmount: order.totalAmount,
        qrCode: ticket.qrCode,
        customerName: order.customerName || undefined,
      });
    }

    toastSuccess(`${tickets.length} tiket berhasil dikirim ke printer.`);
    return true;
  } catch (error: any) {
    toastError(error?.message || "Gagal mencetak tiket melalui printer agent.");
    return false;
  }
}
