"use client";

import React from "react";
import { KioskOrderResult, KioskOrderTicket } from "../../lib/api/orderApi";

interface KioskTicketTemplateProps {
  order: KioskOrderResult;
}

export const KioskTicketTemplate: React.FC<KioskTicketTemplateProps> = ({ order }) => {
  const formatScheduleDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatScheduleTime = (timeStr: string) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return timeStr;
    }
  };

  const formatCurrency = (val: number) => {
    return `Rp ${val.toLocaleString("id-ID")}`;
  };

  return (
    <div id="thermal-print-container" className="hidden print:block text-black bg-white font-mono text-xs leading-tight p-2">
      {order.tickets.map((ticket: KioskOrderTicket, index: number) => (
        <div
          key={ticket.id}
          className="w-[76mm] mx-auto mb-6 pb-6 border-b border-dashed border-gray-400 page-break-after-always"
          style={{ pageBreakAfter: "always" }}
        >
          {/* Cinema Header */}
          <div className="text-center mb-3">
            <h1 className="text-sm font-black tracking-wider uppercase">PLANET CINEMA</h1>
            <p className="text-[10px] text-gray-700">SELF-SERVICE E-TICKET</p>
            <div className="border-t border-b border-black my-1 py-0.5 text-[9px] font-bold">
              {order.studio.name} ({order.studio.type})
            </div>
          </div>

          {/* Movie Details */}
          <div className="mb-2">
            <div className="text-xs font-black uppercase line-clamp-2">{order.movie.title}</div>
            <div className="text-[10px] text-gray-800">
              Rating: {order.movie.censorshipRating} | {order.movie.durationMinutes} Menit
            </div>
          </div>

          {/* Date & Time Grid */}
          <div className="grid grid-cols-2 gap-1 border-t border-dotted border-gray-400 py-1 my-1 text-[10px]">
            <div>
              <span className="text-gray-600 block">TANGGAL:</span>
              <span className="font-bold">{formatScheduleDate(order.showtime.businessDate || order.showtime.startTime)}</span>
            </div>
            <div>
              <span className="text-gray-600 block">JAM TAYANG:</span>
              <span className="font-bold">{formatScheduleTime(order.showtime.startTime)} WIB</span>
            </div>
          </div>

          {/* Seat Number (Large Prominent) */}
          <div className="my-3 py-2 border-2 border-black rounded text-center bg-gray-50">
            <div className="text-[9px] font-bold tracking-widest text-gray-700">KURSI BIOSKOP</div>
            <div className="text-2xl font-black tracking-tight">{ticket.seatLabel}</div>
            <div className="text-[9px] text-gray-600">Baris: {ticket.row} | No: {ticket.seatNumber}</div>
          </div>

          {/* Meta Information */}
          <div className="text-[9px] space-y-0.5 border-t border-dotted border-gray-400 pt-1 mb-2">
            <div className="flex justify-between">
              <span>No. Tiket:</span>
              <span className="font-bold">{ticket.ticketNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>No. Booking:</span>
              <span className="font-bold">{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Pemesan:</span>
              <span>{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span>Harga:</span>
              <span>{formatCurrency(ticket.price)}</span>
            </div>
          </div>

          {/* Barcode representation */}
          <div className="text-center my-2">
            <div className="inline-block px-3 py-1 border border-black font-mono text-[10px] tracking-widest font-black">
              * {ticket.qrCode || ticket.ticketNumber} *
            </div>
          </div>

          {/* Footer Notice */}
          <div className="text-[8px] text-center text-gray-600 border-t border-gray-300 pt-1">
            Tiket ke-{index + 1} dari {order.tickets.length} | Selamat Menonton!
            <br />
            Simpan tiket ini untuk verifikasi petugas studio.
          </div>
        </div>
      ))}
    </div>
  );
};
