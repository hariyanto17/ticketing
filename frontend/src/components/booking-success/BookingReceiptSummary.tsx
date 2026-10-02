import React from "react";

interface BookingReceiptSummaryProps {
  order: any;
  schedule: any;
  tickets: any[];
  formatDate: (date: any) => string;
  formatCurrency: (val: number) => string;
}

export const BookingReceiptSummary: React.FC<BookingReceiptSummaryProps> = ({
  order,
  schedule,
  tickets,
  formatDate,
  formatCurrency,
}) => {
  const rawSubtotal = (schedule as any)?.ticketPrice ? (schedule as any).ticketPrice * tickets.length : 0;
  const serviceFeeVal =
    order.totalAmount > rawSubtotal && rawSubtotal > 0
      ? order.totalAmount - rawSubtotal
      : order.totalAmount > 0 && tickets.length > 0 && order.totalAmount > 40 && (order.totalAmount - 40) % tickets.length === 0
      ? 40
      : 0;

  const ticketSubtotalVal = order.totalAmount - serviceFeeVal;
  const ticketPriceVal = tickets.length > 0 ? Math.floor(ticketSubtotalVal / tickets.length) : (schedule as any)?.ticketPrice || 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
      <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">Rincian Pemesanan</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div className="space-y-1">
          <span className="text-zinc-400 block font-medium">Judul Film</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-50 text-sm">
            {schedule?.movie?.title || "Film Planet Cinema"}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-zinc-400 block font-medium">Studio & Jadwal</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-50">
            {schedule?.studio?.name} •{" "}
            {schedule?.startTime
              ? new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
              : "-"}
          </span>
          <span className="text-[11px] text-zinc-500 block">
            {schedule?.businessDate ? formatDate(schedule.businessDate) : "-"}
          </span>
        </div>

        <div className="space-y-1">
          <span className="text-zinc-400 block font-medium">Kursi Terpilih</span>
          <div className="flex gap-1.5 flex-wrap mt-0.5">
            {tickets.map((t) => (
              <span
                key={t.id}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg font-black text-xs"
              >
                {t.showtimeSeat?.seat?.seatLabel || "-"}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-zinc-400 block font-medium">Nama Pemesan</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-50">{order.customerName}</span>
          <span className="text-[11px] text-zinc-500 block">{order.customerPhone}</span>
        </div>
      </div>

      {/* Detailed Price Breakdown */}
      <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800 space-y-2 text-xs">
        <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
          <span>
            Kursi ({tickets.length}x{ticketPriceVal > 0 ? ` @ ${formatCurrency(ticketPriceVal)}` : ""})
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(ticketSubtotalVal)}
          </span>
        </div>
        {serviceFeeVal > 0 && (
          <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
            <span>Biaya Layanan</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatCurrency(serviceFeeVal)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-zinc-150 dark:border-zinc-800 pt-2 text-sm font-bold text-zinc-900 dark:text-zinc-50">
          <span>Total Pembayaran</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-black">
            {formatCurrency(order.totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};
