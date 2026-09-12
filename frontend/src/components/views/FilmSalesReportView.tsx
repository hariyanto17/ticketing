"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  useGetFilmSalesMoviesQuery,
  useGetFilmShowingDatesQuery,
  useGetFilmSalesReportQuery,
} from "@/services/opsApi";
import { Spinner } from "@/components/ui/spinner";
import { Button, SearchableSelect, SearchableSelectOption } from "@/components/ui/form-controls";
import {
  Film,
  Calendar,
  Printer,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Building2,
  Clock,
  Sparkles,
  Ticket,
  DollarSign,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

import { API_BASE_URL } from "@/lib/api/api";

export default function FilmSalesReportView() {
  const { t, formatCurrency, formatNumber, formatDate, locale } = useTranslation();

  const [selectedMovieId, setSelectedMovieId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // 1. Load ONLY movies that have schedules in the database
  const { data: movies = [], isLoading: moviesLoading } = useGetFilmSalesMoviesQuery();

  // 2. Load showing dates when movie is selected
  const {
    data: showingDates = [],
    isLoading: datesLoading,
    isFetching: datesFetching,
  } = useGetFilmShowingDatesQuery(selectedMovieId, {
    skip: !selectedMovieId,
  });

  // Reset or preselect date when movie changes
  useEffect(() => {
    if (showingDates.length > 0) {
      if (!showingDates.includes(selectedDate)) {
        setSelectedDate(showingDates[0]);
      }
    } else {
      setSelectedDate("");
    }
  }, [showingDates, selectedDate]);

  // 3. Load report data automatically once movie and date are selected
  const {
    data: report,
    isLoading: reportLoading,
    isFetching: reportFetching,
    error: reportError,
  } = useGetFilmSalesReportQuery(
    { movieId: selectedMovieId, showingDate: selectedDate },
    { skip: !selectedMovieId || !selectedDate }
  );

  const selectedMovie = useMemo(() => {
    return movies.find((m: any) => m.id === selectedMovieId);
  }, [movies, selectedMovieId]);

  // Movie options for SearchableSelect
  const movieOptions: SearchableSelectOption[] = useMemo(() => {
    return movies.map((m: any) => ({
      value: m.id,
      label: `${m.title}${m.censorshipRating ? ` (${m.censorshipRating})` : ""}`,
      searchText: `${m.title} ${m.censorshipRating || ""}`,
    }));
  }, [movies]);

  // Date options for SearchableSelect
  const dateOptions: SearchableSelectOption[] = useMemo(() => {
    return showingDates.map((d: string) => ({
      value: d,
      label: `${formatDate(d)} (${d})`,
      searchText: `${formatDate(d)} ${d}`,
    }));
  }, [showingDates, formatDate]);

  // Handle Print Action
  const handlePrint = () => {
    if (!report) return;
    window.print();
  };

  // Handle Excel Export (Download authentic .xlsx generated from master template)
  const handleExportExcel = async () => {
    if (!selectedMovieId || !selectedDate || !report) return;
    setIsExportingExcel(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const response = await fetch(
        `${API_BASE_URL}/reports/film-sales/export/excel?movieId=${selectedMovieId}&showingDate=${selectedDate}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Gagal mengunduh file Excel dari server.");
      }

      const blob = await response.blob();
      const sanitizedTitle = report.movie.title.replace(/[^a-zA-Z0-9]/g, " ").trim().replace(/\s+/g, " ");
      const fileName = `Film Sales Report - ${sanitizedTitle} - ${selectedDate}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export Excel error:", err);
      alert(err.message || "Gagal mengekspor file Excel");
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Page Header (hidden on print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <Film className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>{t("reports.filmSalesReportTitle")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            {t("reports.filmSalesReportSubtitle")}
          </p>
        </div>
      </div>

      {/* 2. Filter Controls (hidden on print) */}
      <div className="print:hidden bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Select Film */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t("reports.selectFilm")}</span>
              <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={selectedMovieId}
              onChange={(val) => setSelectedMovieId(val)}
              options={movieOptions}
              placeholder={moviesLoading ? "Memuat daftar film..." : t("reports.selectFilmPlaceholder")}
              searchPlaceholder="Cari judul film..."
              isLoading={moviesLoading}
              disabled={moviesLoading}
              clearable={true}
            />
          </div>

          {/* Select Showing Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t("reports.showingDate")}</span>
              <span className="text-rose-500">*</span>
            </label>
            <SearchableSelect
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              options={dateOptions}
              placeholder={
                !selectedMovieId
                  ? t("reports.selectFilmPlaceholder")
                  : datesLoading || datesFetching
                    ? "Memuat tanggal tayang..."
                    : showingDates.length === 0
                      ? t("reports.noShowingDates")
                      : "Pilih tanggal tayang"
              }
              searchPlaceholder="Cari tanggal..."
              isLoading={datesLoading || datesFetching}
              disabled={!selectedMovieId || datesLoading || datesFetching || showingDates.length === 0}
              clearable={true}
            />
          </div>
        </div>
      </div>

      {/* 3. Main Report Area */}
      {!selectedMovieId ? (
        <div className="print:hidden bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-xs">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {t("reports.selectFilm")}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {t("reports.selectPrompt")}
          </p>
        </div>
      ) : !selectedDate ? (
        <div className="print:hidden bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-xs">
            <Calendar className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            {showingDates.length === 0 ? t("reports.noShowingDates") : t("reports.selectShowingDate")}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {showingDates.length === 0
              ? "Film ini belum memiliki jadwal tayang aktif di database."
              : "Pilih tanggal tayang di atas untuk melihat rekapitulasi penjualan tiket."}
          </p>
        </div>
      ) : reportLoading || reportFetching ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-16 text-center">
          <Spinner className="w-10 h-10 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Memuat laporan penjualan tiket film...
          </p>
        </div>
      ) : report ? (
        <div className="space-y-4">
          {/* Action Toolbar (hidden on print) */}
          <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-zinc-100 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                {report.showtimes.length} {t("reports.showtime")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t("reports.printReport")}</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-white dark:hover:bg-zinc-800 cursor-pointer shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>{t("reports.exportPdf")}</span>
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                isLoading={isExportingExcel}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-2xs cursor-pointer transition-all disabled:opacity-60"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t("reports.exportExcel")}</span>
              </Button>
            </div>
          </div>

          {/* Printable Report Document */}
          <div
            id="film-sales-report-printable"
            className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm print:border-none print:shadow-none print:p-0 print:m-0 print:bg-white print:text-black"
          >
            {/* Report Header Title */}
            <div className="border-b-2 border-zinc-900 dark:border-zinc-100 print:border-black pb-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-zinc-900 dark:text-zinc-50 print:text-black">
                {report.reportTitle}
              </h2>
            </div>

            {/* Metadata Reference Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 text-xs sm:text-sm mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800 print:border-black">
              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-36 font-bold text-zinc-500 dark:text-zinc-400 print:text-black">
                    {t("reports.distributor")}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                    : {report.distributor || "-"}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-zinc-500 dark:text-zinc-400 print:text-black">
                    {t("reports.site")}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                    : {report.site || report.cinema}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-zinc-500 dark:text-zinc-400 print:text-black">
                    Date of Showing
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                    : {formatDate(report.showingDate)}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex">
                  <span className="w-36 font-bold text-zinc-500 dark:text-zinc-400 print:text-black">
                    {t("reports.movie")}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                    : {report.movie.title}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-36 font-bold text-zinc-500 dark:text-zinc-400 print:text-black">
                    {t("reports.movieFormat")}
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                    : {report.movie.format || "2D"}
                  </span>
                </div>
              </div>
            </div>

            {/* Showtimes Breakdown Table */}
            {report.showtimes.length === 0 ? (
              <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 italic">
                {t("reports.emptyFilmSales")}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 print:bg-gray-100 print:border-black font-bold uppercase tracking-wider text-[11px] text-zinc-500 dark:text-zinc-400 print:text-black">
                      <th className="py-3 px-4">{t("reports.studio")}</th>
                      <th className="py-3 px-4 text-center">{t("reports.showtime")}</th>
                      <th className="py-3 px-4 text-center">{t("reports.seatGrade")}</th>
                      <th className="py-3 px-4 text-right">{t("reports.ticketPrice")}</th>
                      <th className="py-3 px-4 text-center font-black text-indigo-600 dark:text-indigo-400 print:text-black">
                        {t("reports.paidTickets")}
                      </th>
                      <th className="py-3 px-4 text-center">{t("reports.freeTickets")}</th>
                      <th className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 print:text-black">
                        {t("reports.totalSales")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 dark:divide-zinc-800/80 print:divide-black">
                    {report.showtimes.map((st) => (
                      <tr key={st.scheduleId} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100 print:text-black">
                          {st.studioName}{" "}
                          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500 print:text-gray-600">
                            ({st.studioCode})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-zinc-800 dark:text-zinc-200 print:text-black">
                          {st.time}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 print:border-black print:bg-transparent">
                            {st.seatGrade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-zinc-600 dark:text-zinc-400 print:text-black">
                          {formatCurrency(st.ticketPrice)}
                        </td>
                        <td className="py-3 px-4 text-center font-extrabold text-indigo-600 dark:text-indigo-400 text-sm print:text-black">
                          {formatNumber(st.paidTickets)}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-zinc-500 print:text-black">
                          {formatNumber(st.freeTickets)}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm print:text-black">
                          {formatCurrency(st.sales)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-zinc-900 dark:border-zinc-100 bg-zinc-100/60 dark:bg-zinc-800/40 print:bg-gray-100 print:border-black font-black text-xs sm:text-sm">
                      <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-zinc-900 dark:text-zinc-50 print:text-black">
                        TOTAL
                      </td>
                      <td className="py-3.5 px-4 text-center text-indigo-600 dark:text-indigo-400 text-base font-black print:text-black">
                        {formatNumber(report.totals.paidTickets)}
                      </td>
                      <td className="py-3.5 px-4 text-center text-zinc-600 dark:text-zinc-400 text-sm print:text-black">
                        {formatNumber(report.totals.freeTickets)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 dark:text-emerald-400 text-base font-black print:text-black">
                        {formatCurrency(report.totals.sales)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Total Sales Summary Banner */}
            <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 print:border-black print:bg-transparent">
              <div>
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  {t("reports.totalSales")}
                </span>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 print:hidden">
                  Total akumulasi pendapatan tiket yang sah pada tanggal ini
                </p>
              </div>
              <div className="text-xl sm:text-2xl xl:text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight print:text-black">
                {formatCurrency(report.totals.sales)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
