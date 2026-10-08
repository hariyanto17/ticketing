import crypto from "crypto";
import { MIDTRANS_SERVER_KEY } from "../../config/constant";

export const generateMidtransSignature = (
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey = MIDTRANS_SERVER_KEY
): string => {
  const rawString = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  return crypto.createHash("sha512").update(rawString).digest("hex");
};

export const verifyMidtransSignature = (
  payload: {
    order_id: string;
    status_code: string;
    gross_amount: string;
    signature_key: string;
    [key: string]: any;
  },
  serverKey = MIDTRANS_SERVER_KEY
): boolean => {
  if (!serverKey || !/^[a-f\d]{128}$/i.test(payload.signature_key)) {
    return false;
  }

  const expectedSignature = generateMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    serverKey
  );
  const received = Buffer.from(payload.signature_key, "hex");
  const expected = Buffer.from(expectedSignature, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

export const buildMidtransItemDetails = (order: {
  tickets: Array<{
    id: string;
    showtimeSeat: { seat: { seatLabel: string } };
  }>;
  schedule: {
    ticketPrice: number;
    movie: { title: string };
  };
  totalAmount: number;
}) => {
  const itemDetails: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }> = order.tickets.map((t) => ({
    id: t.id.substring(0, 50),
    price: Math.round(order.schedule.ticketPrice),
    quantity: 1,
    name: `${order.schedule.movie.title.substring(0, 35)} (Seat ${t.showtimeSeat.seat.seatLabel})`.substring(0, 50),
  }));

  const ticketPriceRounded = Math.round(order.schedule.ticketPrice);
  const ticketSubtotal = ticketPriceRounded * order.tickets.length;
  const grossAmount = Math.round(order.totalAmount);
  const difference = grossAmount - ticketSubtotal;

  if (difference > 0) {
    itemDetails.push({
      id: "SERVICE-FEE",
      price: difference,
      quantity: 1,
      name: `Biaya Layanan Online (${order.tickets.length} Tiket)`.substring(0, 50),
    });
  } else if (difference < 0) {
    itemDetails.push({
      id: "DISCOUNT",
      price: difference,
      quantity: 1,
      name: "Diskon / Penyesuaian",
    });
  }

  return itemDetails;
};
