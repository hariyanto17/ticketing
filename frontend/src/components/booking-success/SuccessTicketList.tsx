import React from "react";
import { Ticket, QrCode } from "lucide-react";

interface SuccessTicketListProps {
  tickets: any[];
  studioName?: string;
}

export const SuccessTicketList: React.FC<SuccessTicketListProps> = ({ tickets, studioName }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-indigo-600" />
            <span>E-Ticket Resmi</span>
          </h2>
          <p className="text-xs text-zinc-400">Scan QR code tiket ini di pintu masuk teater.</p>
        </div>

        <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
          {tickets.length} Tiket Aktif
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tickets.map((t) => (
          <div
            key={t.id}
            className="p-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase">
                {studioName || "-"}
              </span>
              <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50">
                Kursi {t.showtimeSeat?.seat?.seatLabel || "-"}
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">No: {t.ticketNumber}</p>
            </div>

            <div className="w-20 h-20 bg-white p-1.5 rounded-xl border border-zinc-200 flex items-center justify-center shrink-0">
              <QrCode className="w-full h-full text-zinc-900" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
