"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useGetOrderByIdQuery } from "@/services/orderApi";
import { Spinner } from "@/components/ui/spinner";
import { Printer, ArrowLeft } from "lucide-react";
import { createPrinterAgentClient, getPrinterAgentDeviceId } from "@/services/printerAgentClient";

export default function PrintTickets() {
  const params = useParams();
  const orderId = params.id as string;
  const [printError, setPrintError] = useState<string | null>(null);

  const { data: orderResponse, isLoading } = useGetOrderByIdQuery(orderId);

  useEffect(() => {
    if (orderResponse?.data) {
      const order = orderResponse.data;
      const deviceId = getPrinterAgentDeviceId();
      if (!deviceId) {
        setPrintError("Printer agent belum terhubung ke perangkat ini.");
        return;
      }

      const client = createPrinterAgentClient();
      const startTime = new Date(order.schedule.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
      const showDate = new Date(order.schedule.businessDate).toLocaleDateString("en-CA");
      const price = order.totalAmount / order.tickets.length;

      void (async () => {
        try {
          for (const ticket of order.tickets) {
            await client.printTicket({
              mode: "print",
              ticketNumber: ticket.ticketNumber,
              orderNumber: order.orderNumber,
              movie: order.schedule.movie.title,
              studio: order.schedule.studio.name,
              showDate,
              showTime: startTime,
              seat: ticket.showtimeSeat?.seat?.seatLabel || "-",
              row: ticket.showtimeSeat?.seat?.row || "-",
              seatNumber: ticket.showtimeSeat?.seat?.seatNumber ?? 1,
              price: price ?? 0,
              totalAmount: order.totalAmount,
              qrCode: ticket.qrCode,
              customerName: order.customerName || undefined,
            });
          }
        } catch (error: any) {
          setPrintError(error?.message || "Gagal mencetak melalui printer agent.");
        }
      })();
    }
  }, [orderResponse]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Spinner className="w-10 h-10" />
        <span className="text-zinc-500">Preparing tickets for printing...</span>
      </div>
    );
  }

  const order = orderResponse?.data;
  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-xl font-bold text-rose-600">Order not found</h2>
      </div>
    );
  }

  const movie = order.schedule.movie;
  const studio = order.schedule.studio;
  const startTime = new Date(order.schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = new Date(order.schedule.businessDate).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const purchaseTime = new Date(order.createdAt).toLocaleString();

  return (
    <div className="min-h-screen bg-zinc-100 p-8 print:bg-white print:p-0 font-mono">
      {/* Print Controls (hidden on print) */}
      <div className="max-w-md mx-auto mb-6 flex justify-between items-center print:hidden">
        <button
          onClick={() => window.close()}
          className="px-3.5 py-1.5 border border-zinc-200 bg-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Close Tab
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Screen
        </button>
      </div>

      {printError && (
        <div className="max-w-md mx-auto mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs text-amber-800 print:hidden">
          {printError} You can use Print Screen as a browser fallback.
        </div>
      )}

      {/* Ticket List */}
      <div className="space-y-8 max-w-sm mx-auto">
        {order.tickets.map((ticket, idx) => (
          <div
            key={ticket.id}
            className="bg-white p-6 border border-zinc-200 rounded-lg shadow-sm relative print:shadow-none print:border-none print:p-0 page-break-after"
          >
            {/* Cut Line indicator (hidden on print) */}
            {idx > 0 && (
              <div className="absolute -top-4 left-0 right-0 border-t border-dashed border-zinc-300 print:hidden" />
            )}

            {/* Header */}
            <div className="text-center border-b border-dashed border-zinc-300 pb-4 mb-4 flex flex-col items-center">
              <img
                src="/PLANET-CINEMA-LOGO-2-COLOR.png"
                alt="Planet Cinema"
                className="h-8 w-auto object-contain mb-1"
              />
              <span className="text-[10px] text-zinc-400">TICKET RECEIPT</span>
            </div>

            {/* Film details */}
            <div className="space-y-3.5 text-xs text-zinc-800">
              <div className="space-y-0.5">
                <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">MOVIE</span>
                <span className="font-bold text-sm text-zinc-950 uppercase">{movie.title}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">STUDIO</span>
                  <span className="font-bold text-zinc-900">{studio.name} ({studio.code})</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">SEAT</span>
                  <span className="font-bold text-base text-zinc-950 underline decoration-indigo-500 decoration-2">
                    {ticket.showtimeSeat?.seat?.seatLabel || "TBD"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">DATE</span>
                  <span className="font-bold text-zinc-900">{date}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">TIME</span>
                  <span className="font-bold text-zinc-900">{startTime}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">TICKET NO</span>
                  <span className="font-bold text-[10px] text-zinc-900">{ticket.ticketNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-400 uppercase tracking-wider block">PRICE</span>
                  <span className="font-bold text-zinc-900">Rp {order.totalAmount / order.tickets.length}</span>
                </div>
              </div>
            </div>

            {/* QR Code and Footer */}
            <div className="mt-6 pt-4 border-t border-dashed border-zinc-300 flex flex-col items-center gap-2">
              <div className="w-28 h-28 border border-zinc-200 p-1 bg-white rounded-md flex items-center justify-center">
                {/* SVG Mock QR Code displaying grid representation */}
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <rect width="100" height="100" fill="white" />
                  {/* Outer Frame anchors */}
                  <rect x="5" y="5" width="25" height="25" fill="black" />
                  <rect x="10" y="10" width="15" height="15" fill="white" />
                  <rect x="12" y="12" width="11" height="11" fill="black" />

                  <rect x="70" y="5" width="25" height="25" fill="black" />
                  <rect x="75" y="10" width="15" height="15" fill="white" />
                  <rect x="77" y="12" width="11" height="11" fill="black" />

                  <rect x="5" y="70" width="25" height="25" fill="black" />
                  <rect x="10" y="75" width="15" height="15" fill="white" />
                  <rect x="12" y="77" width="11" height="11" fill="black" />

                  {/* Random grid lines to simulate real QR */}
                  <rect x="40" y="10" width="5" height="5" fill="black" />
                  <rect x="55" y="15" width="10" height="5" fill="black" />
                  <rect x="45" y="30" width="5" height="15" fill="black" />
                  <rect x="5" y="45" width="15" height="5" fill="black" />
                  <rect x="55" y="45" width="5" height="5" fill="black" />
                  <rect x="75" y="45" width="10" height="10" fill="black" />
                  <rect x="40" y="60" width="15" height="5" fill="black" />
                  <rect x="65" y="70" width="5" height="15" fill="black" />
                  <rect x="80" y="80" width="10" height="10" fill="black" />
                </svg>
              </div>
              <span className="text-[8px] text-zinc-400 text-center tracking-widest">{ticket.ticketNumber}</span>
            </div>

            <div className="text-center mt-4">
              <span className="text-[7.5px] text-zinc-300">PURCHASED: {purchaseTime}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Printing style definitions */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .page-break-after {
            page-break-after: always;
            border: none !important;
            box-shadow: none !important;
            padding: 20px 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
