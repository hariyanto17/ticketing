"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useGetMoviesQuery, Movie } from "@/services/movieApi";
import { useGetSchedulesQuery, useGetScheduleSeatsQuery, useHoldSeatsMutation, useReleaseSeatsMutation, Schedule, ShowtimeSeat } from "@/services/studioApi";
import { useCheckoutOrderMutation } from "@/services/orderApi";
import { useToast } from "@/components/ui/toast";
import { Button, SearchableSelect } from "@/components/ui/form-controls";
import { Spinner } from "@/components/ui/spinner";
import { CurrencyInput } from "@/components/ui/CurrencyInput";
import { getVisualRowOrder, groupSeatsByRow } from "@/lib/seatLayout";
import { Film, Clock, Armchair, Ticket, Check, Receipt, Printer, X, Eye, EyeOff, Calendar, Monitor, Tv, Cast } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { io } from "socket.io-client";
import { API_BASE_URL, SOCKET_BASE_URL } from "@/lib/api/api";
import Link from "next/link";
import { useGetActiveDrawerQuery, useOpenDrawerMutation, useCloseDrawerMutation } from "@/services/opsApi";
import { createPrinterAgentClient, getPrinterAgentDeviceId } from "@/services/printerAgentClient";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import {
  openCustomerDisplayWindow,
  CUSTOMER_DISPLAY_CHANNEL_NAME,
  CustomerDisplayMessage,
  CustomerDisplayStatePayload,
} from "@/lib/customerDisplay";

const getRowIndex = (row: string): number => {
  let index = 0;
  for (let i = 0; i < row.length; i++) {
    index = index * 26 + (row.charCodeAt(i) - 64);
  }
  return index - 1;
};

export default function CashierWorkspace() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { t, formatDate, formatCurrency, locale } = useTranslation();

  // Cash drawer hooks & local state
  const { data: activeDrawer, isLoading: drawerLoading, refetch: refetchActiveDrawer } = useGetActiveDrawerQuery();
  const [openDrawer, { isLoading: isOpeningDrawer }] = useOpenDrawerMutation();
  const [closeDrawer, { isLoading: isClosingDrawer }] = useCloseDrawerMutation();
  const [drawerOpeningBalance, setDrawerOpeningBalance] = useState<number>(0);
  const [drawerActualBalance, setDrawerActualBalance] = useState<number>(0);
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false);
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false);
  const [drawerSummary, setDrawerSummary] = useState<any | null>(null);
  const hasPromptedDrawerRef = React.useRef(false);

  // Auto-prompt to open cash drawer once if there is no active session
  useEffect(() => {
    if (!drawerLoading && activeDrawer === null && !hasPromptedDrawerRef.current) {
      hasPromptedDrawerRef.current = true;
      setIsOpenDrawerModalOpen(true);
    }
  }, [drawerLoading, activeDrawer]);

  // Ensure modal closes when activeDrawer session is detected
  useEffect(() => {
    if (activeDrawer) {
      setIsOpenDrawerModalOpen(false);
    }
  }, [activeDrawer]);

  // Selected state
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<ShowtimeSeat[]>([]);
  const [showTomorrow, setShowTomorrow] = useState<boolean>(false);

  // Checkout states
  const [lastSelectedSeats, setLastSelectedSeats] = useState<ShowtimeSeat[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Queries (only fetch movies with active schedules from today onwards)
  const { data: moviesResponse, isLoading: moviesLoading, error: moviesError } = useGetMoviesQuery({
    status: "NOW_SHOWING",
    hasSchedule: true,
    startDate: todayStr,
    limit: 100,
  });

  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery(
    { movieId: selectedMovie?.id || undefined, status: "PUBLISHED", startDate: todayStr },
    { skip: !selectedMovie }
  );

  // Filter schedules to only include Today and Tomorrow (exclude yesterday / past days)
  const { todaySchedules, tomorrowSchedules } = useMemo(() => {
    if (!schedulesResponse?.data) {
      return { todaySchedules: [], tomorrowSchedules: [] };
    }

    const now = new Date();
    const formatYMD = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatYMD(now);
    const tomorrowObj = new Date(now);
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = formatYMD(tomorrowObj);

    const getScheduleYMD = (sched: Schedule) => {
      const d = new Date(sched.businessDate || sched.startTime);
      return formatYMD(d);
    };

    const todayList: Schedule[] = [];
    const tomorrowList: Schedule[] = [];

    for (const s of schedulesResponse.data) {
      const sYMD = getScheduleYMD(s);
      if (sYMD === todayStr) {
        todayList.push(s);
      } else if (sYMD === tomorrowStr) {
        tomorrowList.push(s);
      }
    }

    // Sort by startTime ascending
    todayList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    tomorrowList.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return { todaySchedules: todayList, tomorrowSchedules: tomorrowList };
  }, [schedulesResponse?.data]);

  const { data: seatsResponse, isLoading: seatsLoading, refetch: refetchSeats } = useGetScheduleSeatsQuery(
    selectedSchedule?.id || "",
    { skip: !selectedSchedule }
  );

  // Mutations
  const [holdSeats] = useHoldSeatsMutation();
  const [releaseSeats] = useReleaseSeatsMutation();
  const [checkoutOrder, { isLoading: isCheckingOut }] = useCheckoutOrderMutation();

  // Refs to track active selections for reliable unmount/navigation cleanup
  const selectedScheduleRef = React.useRef<Schedule | null>(null);
  const selectedSeatsRef = React.useRef<ShowtimeSeat[]>([]);

  useEffect(() => {
    selectedScheduleRef.current = selectedSchedule;
  }, [selectedSchedule]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  // Safely release held seats on backend
  const releaseHeldSeatsSafely = async (scheduleId?: string, seatsToRelease?: ShowtimeSeat[]) => {
    const targetScheduleId = scheduleId || selectedScheduleRef.current?.id;
    const targetSeats = seatsToRelease || selectedSeatsRef.current;
    if (!targetScheduleId || !targetSeats || targetSeats.length === 0) return;

    try {
      await releaseSeats({
        scheduleId: targetScheduleId,
        seatIds: targetSeats.map((s) => s.seatId),
      }).unwrap();
    } catch (err) {
      console.warn("Failed to release held seats:", err);
    }
  };

  // Socket.IO synchronization
  useEffect(() => {
    if (!selectedSchedule?.id) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.on("seats_held", (data: any) => {
      if (data?.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    socket.on("seats_released", (data: any) => {
      if (data?.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    socket.on("seats_sold", (data: any) => {
      if (data?.showtimeId === selectedSchedule.id) {
        refetchSeats();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedSchedule?.id, refetchSeats]);

  // Clean up and release held seats when navigating away from the cashier page
  useEffect(() => {
    return () => {
      const targetScheduleId = selectedScheduleRef.current?.id;
      const targetSeats = selectedSeatsRef.current;
      if (targetScheduleId && targetSeats && targetSeats.length > 0) {
        releaseSeats({
          scheduleId: targetScheduleId,
          seatIds: targetSeats.map((s) => s.seatId),
        });
      }
    };
  }, [releaseSeats]);

  // Clean up and release held seats on window close or refresh
  useEffect(() => {
    const handlePageUnload = () => {
      const targetScheduleId = selectedScheduleRef.current?.id;
      const targetSeats = selectedSeatsRef.current;
      if (targetScheduleId && targetSeats && targetSeats.length > 0) {
        const payload = JSON.stringify({ seatIds: targetSeats.map((s) => s.seatId) });
        navigator.sendBeacon(`${API_BASE_URL}/schedules/${targetScheduleId}/release`, new Blob([payload], { type: "application/json" }));
      }
    };

    window.addEventListener("beforeunload", handlePageUnload);
    window.addEventListener("pagehide", handlePageUnload);
    return () => {
      window.removeEventListener("beforeunload", handlePageUnload);
      window.removeEventListener("pagehide", handlePageUnload);
    };
  }, []);

  useEffect(() => {
    if (moviesError) {
      toastError(t("cashier.loadFailed"));
    }
  }, [moviesError, toastError]);

  // When movie changes, release previously held seats and reset downstream selections
  const handleMovieSelect = async (movie: Movie | null) => {
    if (selectedSchedule && selectedSeats.length > 0) {
      await releaseHeldSeatsSafely(selectedSchedule.id, selectedSeats);
    }
    setSelectedMovie(movie);
    setSelectedSchedule(null);
    setSelectedSeats([]);
  };

  // When schedule changes, release previously held seats and reset seat selections
  const handleScheduleSelect = async (sched: Schedule) => {
    if (selectedSchedule && selectedSeats.length > 0 && selectedSchedule.id !== sched.id) {
      await releaseHeldSeatsSafely(selectedSchedule.id, selectedSeats);
    }
    setSelectedSchedule(sched);
    setSelectedSeats([]);
  };

  // Toggle seat selection
  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === "SOLD" || seat.status === "DISABLED") return;

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    try {
      if (isAlreadySelected) {
        // Release hold on backend
        await releaseSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      } else {
        // Hold seat on backend
        await holdSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => [...prev, seat]);
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

  // Clear all selections and release held seats on backend
  const handleClearSelection = async () => {
    if (selectedSchedule && selectedSeats.length > 0) {
      await releaseHeldSeatsSafely(selectedSchedule.id, selectedSeats);
    }
    setSelectedSeats([]);
  };

  const handleOpenDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openDrawer({ openingBalance: Number(drawerOpeningBalance) || 0 }).unwrap();
      setIsOpenDrawerModalOpen(false);
      await refetchActiveDrawer();
      toastSuccess(t("cashier.drawerOpened"));
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerFailed"));
    }
  };

  const handleCloseDrawerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const summary = await closeDrawer({ actualBalance: drawerActualBalance }).unwrap();
      setDrawerSummary(summary);
      setIsCloseDrawerModalOpen(false);
      toastSuccess(t("cashier.drawerClosed"));
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerFailed"));
    }
  };

  const { theme } = useTheme();
  const customerWindowRef = React.useRef<Window | null>(null);
  const [isCustomerDisplayConnected, setIsCustomerDisplayConnected] = useState(false);
  const broadcastChannelRef = React.useRef<BroadcastChannel | null>(null);

  // Calculations
  const ticketPrice = selectedSchedule?.ticketPrice || 0;
  const quantity = selectedSeats.length;
  const totalAmount = quantity * ticketPrice;
  const change = amountReceived !== "" && Number(amountReceived) >= totalAmount ? Number(amountReceived) - totalAmount : 0;

  // Build clean customer-facing state payload
  const getCustomerDisplayPayload = (): CustomerDisplayStatePayload => {
    return {
      movie: selectedMovie
        ? {
            id: selectedMovie.id,
            title: selectedMovie.title,
            poster: selectedMovie.poster,
            censorshipRating: selectedMovie.censorshipRating,
            durationMinutes: selectedMovie.durationMinutes,
          }
        : null,
      schedule: selectedSchedule
        ? {
            id: selectedSchedule.id,
            studioName: selectedSchedule.studio?.name || "Studio",
            studioCode: selectedSchedule.studio?.code,
            startTime: selectedSchedule.startTime,
            businessDate: selectedSchedule.businessDate || selectedSchedule.startTime,
            ticketPrice: selectedSchedule.ticketPrice || 0,
          }
        : null,
      seats: seatsResponse?.data || [],
      selectedSeats: selectedSeats,
      quantity,
      ticketPrice,
      totalAmount,
      theme: (theme as any) || "system",
      locale: (locale as any) || "id",
      lastUpdated: Date.now(),
    };
  };

  // BroadcastChannel setup & message listener
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL_NAME);
    broadcastChannelRef.current = channel;

    const handleMessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      const data = event.data;
      if (!data || !data.type) return;

      if (data.type === "CUSTOMER_DISPLAY_REQUEST_STATE") {
        setIsCustomerDisplayConnected(true);
        channel.postMessage({
          type: "CUSTOMER_DISPLAY_STATE",
          payload: getCustomerDisplayPayload(),
        });
      } else if (data.type === "CUSTOMER_DISPLAY_PING") {
        setIsCustomerDisplayConnected(true);
        channel.postMessage({ type: "CUSTOMER_DISPLAY_PONG" });
      } else if (data.type === "CUSTOMER_DISPLAY_PONG") {
        setIsCustomerDisplayConnected(true);
      } else if (data.type === "CUSTOMER_DISPLAY_CLOSED") {
        setIsCustomerDisplayConnected(false);
        customerWindowRef.current = null;
      }
    };

    channel.addEventListener("message", handleMessage);

    return () => {
      channel.removeEventListener("message", handleMessage);
      channel.close();
      broadcastChannelRef.current = null;
    };
  }, [selectedMovie, selectedSchedule, seatsResponse?.data, selectedSeats, ticketPrice, totalAmount, theme, locale]);

  // Broadcast state updates immediately on any state change
  useEffect(() => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "CUSTOMER_DISPLAY_STATE",
        payload: getCustomerDisplayPayload(),
      });
    }
  }, [selectedMovie, selectedSchedule, seatsResponse?.data, selectedSeats, ticketPrice, totalAmount, theme, locale]);

  // Open / Focus Customer Display Window
  const handleOpenCustomerDisplay = async () => {
    const result = await openCustomerDisplayWindow(customerWindowRef.current);
    if (result.windowRef) {
      customerWindowRef.current = result.windowRef;
    }

    if (result.status === "opened_secondary") {
      toastSuccess(t("cashier.customerDisplayOpened"));
      setIsCustomerDisplayConnected(true);
    } else if (result.status === "opened_single_monitor" || result.status === "opened_fallback") {
      toastSuccess(t("cashier.customerDisplayFallbackOpened"));
      setIsCustomerDisplayConnected(true);
    } else if (result.status === "already_open") {
      setIsCustomerDisplayConnected(true);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "CUSTOMER_DISPLAY_STATE",
          payload: getCustomerDisplayPayload(),
        });
      }
    } else if (result.status === "blocked") {
      toastError(t("cashier.popupBlocked"));
    }
  };

  const handleCheckoutSubmit = async () => {
    if (!selectedSchedule || selectedSeats.length === 0) return;

    if (paymentMethod === "CASH") {
      if (amountReceived === "" || Number(amountReceived) < totalAmount) {
        toastError(t("cashier.amountError"));
        return;
      }
    }

    if (!activeDrawer) {
      toastError("Sesi laci kas belum dibuka. Silakan buka laci kas terlebih dahulu.");
      setIsOpenDrawerModalOpen(true);
      return;
    }

    try {
      const seatsSnapshot = [...selectedSeats];
      setLastSelectedSeats(seatsSnapshot);

      const response = await checkoutOrder({
        scheduleId: selectedSchedule.id,
        seatIds: selectedSeats.map((s) => s.seatId),
        paymentMethod,
        amountReceived: paymentMethod === "CASH" ? Number(amountReceived) : null,
      }).unwrap();

      // Ensure ticket showtimeSeat relation is always present with seat and row details
      const seatsMap = new Map(seatsSnapshot.map((s) => [s.id, s]));
      const seatIdMap = new Map(seatsSnapshot.map((s) => [s.seatId, s]));

      const enrichedTickets = (response.data?.tickets || []).map((ticket: any, idx: number) => {
        const matchedSeat =
          (ticket.showtimeSeatId && seatsMap.get(ticket.showtimeSeatId)) ||
          (ticket.showtimeSeatId && seatIdMap.get(ticket.showtimeSeatId)) ||
          seatsSnapshot[idx];

        return {
          ...ticket,
          showtimeSeat: ticket.showtimeSeat?.seat
            ? ticket.showtimeSeat
            : matchedSeat
            ? {
                ...(ticket.showtimeSeat || {}),
                id: matchedSeat.id,
                seatId: matchedSeat.seatId,
                showtimeId: matchedSeat.showtimeId,
                status: matchedSeat.status,
                seat: matchedSeat.seat,
              }
            : ticket.showtimeSeat,
        };
      });

      setCheckoutResult({
        ...response.data,
        tickets: enrichedTickets,
      });
      setIsSuccessModalOpen(true);
      toastSuccess(t("cashier.transactionSuccess"));

      // Clear selections
      setSelectedSeats([]);
      setAmountReceived("");
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

  const handlePrintTickets = async () => {
    const order = checkoutResult?.order;
    const tickets = checkoutResult?.tickets;
    if (!order || !selectedSchedule || !tickets?.length) {
      toastError("Data tiket belum tersedia untuk dicetak.");
      return;
    }

    if (!getPrinterAgentDeviceId()) {
      toastError("Printer agent belum terhubung ke perangkat ini.");
      return;
    }

    try {
      setIsPrinting(true);
      const client = createPrinterAgentClient();
      const startTime = new Date(selectedSchedule.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
      const showDate = new Date(selectedSchedule.businessDate).toLocaleDateString("en-CA");
      const price = order.totalAmount / tickets.length;

      for (let idx = 0; idx < tickets.length; idx++) {
        const ticket = tickets[idx];
        const seatObj =
          ticket.showtimeSeat?.seat ||
          lastSelectedSeats.find((s) => s.id === ticket.showtimeSeatId || s.seatId === ticket.showtimeSeatId)?.seat ||
          lastSelectedSeats[idx]?.seat;

        await client.printTicket({
          mode: "print",
          ticketNumber: ticket.ticketNumber,
          orderNumber: order.orderNumber,
          movie: selectedSchedule.movie.title,
          studio: selectedSchedule.studio.name,
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
    } catch (error: any) {
      toastError(error?.message || "Gagal mencetak tiket melalui printer agent.");
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans items-start">
      {/* TOP BAR: ACTION BUTTONS & DUAL MONITOR CONTROL */}
      <div className="lg:col-span-12 flex items-center justify-between flex-wrap gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              {t("cashier.seatLayout")} & Customer Screen
            </h2>
            <p className="text-xs text-zinc-400">
              Sinkronisasi layar pelanggan realtime pada monitor kedua.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCustomerDisplayConnected && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>{t("cashier.customerDisplayActive")}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenCustomerDisplay}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-indigo-500/20 flex items-center gap-2"
          >
            <Cast className="w-4 h-4" />
            <span>{t("cashier.displayOnSecondMonitor")}</span>
          </button>
        </div>
      </div>

      {/* TOP BANNER: CASH DRAWER SESSION STATUS */}
      <div className="lg:col-span-12">
        {drawerLoading ? null : activeDrawer ? (
          <div className="p-4 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-wrap gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  Sesi Laci Kas Aktif (Cash Drawer Open)
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Modal Awal: <span className="font-bold">{formatCurrency(activeDrawer.openingBalance)}</span> • Dibuka: {new Date(activeDrawer.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setDrawerActualBalance(0);
                setIsCloseDrawerModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-zinc-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Tutup Sesi Laci Kas
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center justify-between flex-wrap gap-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              <span className="flex h-3.5 w-3.5 rounded-full bg-amber-500"></span>
              <div>
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Sesi Laci Kas Belum Dibuka
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Kasir wajib membuka sesi laci kas dengan modal awal sebelum dapat memproses transaksi tiket.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpenDrawerModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
            >
              Buka Laci Kas Sekarang
            </button>
          </div>
        )}
      </div>

      {/* LEFT PANEL: SELECTORS & SEAT MAP */}
      <div className="lg:col-span-8 space-y-6">

        {/* Movie Selector */}
        <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-600" /> {t("cashier.movie")}
          </h2>

          {moviesLoading ? (
            <div className="flex justify-center py-6"><Spinner className="w-8 h-8" /></div>
          ) : moviesResponse?.data?.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">{t("cashier.noMovies")}</p>
          ) : (
            <div className="max-w-md">
              <SearchableSelect
                label={t("cashier.movie")}
                value={selectedMovie?.id || ""}
                onChange={(movieId) => {
                  if (!movieId) {
                    handleMovieSelect(null);
                    return;
                  }

                  const movie = moviesResponse?.data?.find((item) => item.id === movieId) || null;
                  handleMovieSelect(movie);
                }}
                options={(moviesResponse?.data || []).map((movie) => ({
                  value: movie.id,
                  label: movie.title,
                  searchText: movie.censorshipRating,
                }))}
                placeholder={t("cashier.movie")}
                searchPlaceholder={t("cashier.movie")}
                clearable
              />
            </div>
          )}
        </div>

        {/* Schedule Selector */}
        {selectedMovie && (
          <div className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" /> {t("cashier.schedule")}
              </h2>

              {tomorrowSchedules.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTomorrow(!showTomorrow)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  {showTomorrow ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Sembunyikan Jadwal Besok</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tampilkan Jadwal Besok ({tomorrowSchedules.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {schedulesLoading ? (
              <div className="flex justify-center py-6"><Spinner className="w-8 h-8" /></div>
            ) : todaySchedules.length === 0 && tomorrowSchedules.length === 0 ? (
              <p className="text-zinc-400 text-sm italic">{t("cashier.noSchedules")}</p>
            ) : (
              <div className="space-y-5">
                {/* Today's Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Hari Ini
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {todaySchedules.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic pl-1">Tidak ada jadwal tayang untuk hari ini.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {todaySchedules.map((sched) => {
                        const start = new Date(sched.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const studioName = sched.studio?.name || "Studio";
                        const isSelected = selectedSchedule?.id === sched.id;

                        return (
                          <button
                            key={sched.id}
                            type="button"
                            onClick={() => handleScheduleSelect(sched)}
                            className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20 shadow-sm"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-bold">{start}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                              {studioName}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(sched.ticketPrice)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Tomorrow's Section (Only shown when showTomorrow is true) */}
                {showTomorrow && tomorrowSchedules.length > 0 && (
                  <div className="pt-4 border-t border-zinc-150 dark:border-zinc-800/80 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        Besok
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        {(() => {
                          const tmr = new Date();
                          tmr.setDate(tmr.getDate() + 1);
                          return tmr.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
                        })()}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {tomorrowSchedules.map((sched) => {
                        const start = new Date(sched.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const studioName = sched.studio?.name || "Studio";
                        const isSelected = selectedSchedule?.id === sched.id;

                        return (
                          <button
                            key={sched.id}
                            type="button"
                            onClick={() => handleScheduleSelect(sched)}
                            className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer flex items-center gap-2.5 ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 shadow-sm"
                                : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                            }`}
                          >
                            <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="font-bold">{start}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">
                              {studioName}
                            </span>
                            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(sched.ticketPrice)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interactive Seat Map */}
        {selectedSchedule && (
          <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 self-start mb-6">
              <Armchair className="w-5 h-5 text-amber-500" /> {t("cashier.seatLayout")}
            </h2>

            {seatsLoading ? (
              <Spinner className="w-8 h-8 py-10" />
            ) : (
              <div className="w-full flex flex-col items-center">
                {/* Seat Grid */}
                {(() => {
                  const showtimeSeats = seatsResponse?.data || [];
                  const seatsByRow = groupSeatsByRow(showtimeSeats.map((s) => ({ ...s, row: s.seat.row })));
                  const rows = getVisualRowOrder(Object.keys(seatsByRow));
                  const maxColumn = showtimeSeats.length > 0 ? Math.max(...showtimeSeats.map((s) => s.seat.column)) : 12;
                  const cols = Array.from({ length: maxColumn }, (_, i) => i + 1);

                  return (
                    <div className="grid gap-2.5 overflow-x-auto w-full pb-4">
                      <div className="w-full max-w-md bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 text-center py-1.5 rounded-b-2xl font-bold tracking-widest text-[10px] uppercase mb-4">
                        {t("cashier.screen")}
                      </div>
                      {rows.map((row) => (
                        <div key={row} className="flex gap-2.5 items-center justify-center min-w-[400px]">
                          <span className="w-6 text-center font-bold text-zinc-400 text-xs">{row}</span>
                          {cols.map((col) => {
                            const seat = seatsByRow[row]?.find((x) => x.seat.column === col) || null;
                            if (!seat) {
                              return <div key={`gap-${row}-${col}`} className="w-8 h-8 sm:w-10 sm:h-10 xl:w-11 xl:h-11" />;
                            }

                            const isSelected = selectedSeats.some((s) => s.id === seat.id);
                            const isHold = seat.status === "HOLD" && !isSelected;

                            // Determine colors
                            let seatColor = "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"; // AVAILABLE
                            if (seat.status === "DISABLED") seatColor = "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-650 cursor-not-allowed";
                            else if (seat.status === "SOLD") seatColor = "bg-rose-500 text-white cursor-not-allowed";
                            else if (isHold) seatColor = "bg-amber-400 text-white cursor-not-allowed";
                            else if (isSelected) seatColor = "bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-500/20";

                            return (
                              <button
                                key={seat.id}
                                onClick={() => handleSeatClick(seat)}
                                disabled={seat.status === "SOLD" || seat.status === "DISABLED" || isHold}
                                className={`w-8 h-8 sm:w-10 sm:h-10 xl:w-11 xl:h-11 rounded-xl text-[10px] sm:text-xs font-bold border transition-all flex items-center justify-center ${seatColor}`}
                              >
                                {seat.seat.seatLabel}
                              </button>
                            );
                          })}
                          <span className="w-6 text-center font-bold text-zinc-400 text-xs">{row}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 justify-center mt-10 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full max-w-md text-[11px] font-semibold text-zinc-400">
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-emerald-600 rounded-sm" /> {t("cashier.available")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-amber-400 rounded-sm" /> {t("cashier.hold")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-rose-500 rounded-sm" /> {t("cashier.sold")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-indigo-600 rounded-sm" /> {t("cashier.selected")}</div>
                  <div className="flex items-center gap-1.5"><div className="w-3.5 h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-sm" /> {t("cashier.disabled")}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: BILLING & CHECKOUT */}
      <div className="lg:col-span-4 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-6">
        <div className="border-b border-zinc-100 dark:border-zinc-800 pb-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Cash Drawer</h2>
              <p className="text-xs text-zinc-400 mt-1">
                {drawerLoading
                  ? "Checking drawer status..."
                  : activeDrawer
                    ? `Opened with ${formatCurrency(activeDrawer.openingBalance)}`
                    : "Open a drawer before processing checkout."}
              </p>
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${activeDrawer
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
              }`}>
              {activeDrawer ? "Open" : "Closed"}
            </span>
          </div>

          {activeDrawer ? (
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(true)}
              className="w-full px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/20"
            >
              Close Cash Drawer
            </button>
          ) : (
            <form onSubmit={handleOpenDrawerSubmit} className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500">Opening Balance (IDR)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  value={drawerOpeningBalance}
                  onChange={(e) => setDrawerOpeningBalance(Number(e.target.value))}
                  className="min-w-0 flex-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold"
                />
                <button
                  type="submit"
                  disabled={isOpeningDrawer || drawerLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-bold"
                >
                  {isOpeningDrawer ? "Opening..." : "Open Drawer"}
                </button>
              </div>
            </form>
          )}
        </div>

        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center gap-2">
          <Ticket className="w-5.5 h-5.5 text-indigo-600" /> {t("cashier.summary")}
        </h2>

        {/* Selected Movie details */}
        {selectedMovie ? (
          <div className="space-y-1">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50 text-sm leading-tight">{selectedMovie.title}</h3>
            {selectedSchedule && (
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <span>{selectedSchedule.studio.name} ({selectedSchedule.studio.code})</span>
                <span>•</span>
                <span>{new Date(selectedSchedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">{t("cashier.selectPrompt")}</p>
        )}

        {/* Seats List */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-zinc-400">
            <span>{t("cashier.seatsSelected")} ({quantity})</span>
            {quantity > 0 && (
              <button onClick={handleClearSelection} className="text-rose-500 hover:underline cursor-pointer">
                {t("cashier.clear")}
              </button>
            )}
          </div>
          {quantity > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedSeats.map((s) => (
                <span
                  key={s.id}
                  className="px-2.5 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-xl text-xs font-bold text-zinc-800 dark:text-zinc-200"
                >
                  {s.seat.seatLabel}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400 italic">{t("cashier.noSeats")}</p>
          )}
        </div>

        {/* Pricing Math */}
        <div className="border-t border-b border-zinc-100 dark:border-zinc-800 py-4 space-y-2">
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t("cashier.ticketPrice")}</span>
            <span>Rp {ticketPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm text-zinc-500">
            <span>{t("cashier.quantity")}</span>
            <span>x{quantity}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-zinc-900 dark:text-zinc-50 pt-1">
            <span>{t("cashier.total")}</span>
            <span>Rp {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Payment Configuration */}
        {quantity > 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("cashier.paymentMethod")}</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod("CASH")}
                  className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${paymentMethod === "CASH"
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300"
                    }`}
                >
                  CASH / TUNAI
                </button>
                <button
                  onClick={() => setPaymentMethod("QRIS")}
                  className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition-all ${paymentMethod === "QRIS"
                      ? "border-indigo-600 bg-indigo-50/20 text-indigo-600 dark:text-indigo-400 font-bold"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:border-zinc-300"
                    }`}
                >
                  QRIS CODE
                </button>
              </div>
            </div>

            {/* CASH Payment UI details */}
            {paymentMethod === "CASH" && (
              <div className="space-y-3.5">
                <CurrencyInput
                  label={t("cashier.amountReceived")}
                  value={amountReceived}
                  onChange={(val) => setAmountReceived(val === 0 ? "" : val)}
                  placeholder={t("cashier.cashPlaceholder")}
                />
                {/* Change calculator representation */}
                <div className="flex justify-between text-sm font-semibold p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl">
                  <span className="text-zinc-500">{t("cashier.change")}</span>
                  <span className={change > 0 ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-zinc-400"}>
                    Rp {change.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* QRIS Simulated QR Display */}
            {paymentMethod === "QRIS" && (
              <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 rounded-2xl flex flex-col items-center gap-2">
                <div className="w-32 h-32 bg-white p-2 rounded-xl border border-zinc-200 flex items-center justify-center">
                  {/* Simplistic mock QR code layout */}
                  <div className="grid grid-cols-4 gap-2 w-full h-full opacity-65">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className={`rounded-xs ${i % 3 === 0 || i % 7 === 1 ? "bg-black" : "bg-white"}`} />
                    ))}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">
                  {t("cashier.scan")} {formatCurrency(totalAmount)}
                </span>
              </div>
            )}

            {/* Checkout CTA */}
            <Button
              onClick={handleCheckoutSubmit}
              isLoading={isCheckingOut}
              className="w-full py-2.5 font-bold tracking-wide rounded-2xl flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t("cashier.process")}
            </Button>
          </div>
        )}
      </div>

      {/* Transaction Complete Modal */}
      <Modal isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} title={t("cashier.completed")}>
        <div className="space-y-6 text-center py-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 dark:border-emerald-950/40">
            <Receipt className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("cashier.confirmed")}</h3>
            <p className="text-zinc-500 text-sm mt-1">
              Order **{checkoutResult?.order?.orderNumber}** generated successfully.
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            {checkoutResult?.order?.id && (
              <button
                type="button"
                onClick={() => void handlePrintTickets()}
                disabled={isPrinting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> {isPrinting ? "Printing..." : t("cashier.print")}
              </button>
            )}
            <button
              onClick={() => setIsSuccessModalOpen(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Open Cash Drawer Modal */}
      <Modal isOpen={isOpenDrawerModalOpen} onClose={() => setIsOpenDrawerModalOpen(false)} title="Buka Sesi Laci Kas (Open Cash Drawer)">
        <form onSubmit={handleOpenDrawerSubmit} className="space-y-6 py-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-2xl">
            <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold leading-relaxed">
              Silakan masukkan nominal modal awal uang tunai yang ada di dalam laci kas sebelum memulai transaksi kasir tiket.
            </p>
          </div>

          <CurrencyInput
            label="Saldo Awal Kas Tunai (IDR)"
            value={drawerOpeningBalance}
            onChange={(val) => setDrawerOpeningBalance(val)}
            placeholder="500.000"
            min={0}
            required
          />

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsOpenDrawerModalOpen(false)}
              className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Nanti Saja
            </button>
            <button
              type="submit"
              disabled={isOpeningDrawer}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2 shadow-sm"
            >
              {isOpeningDrawer ? <Spinner className="w-4 h-4" /> : "Buka Laci Kas & Mulai Transaksi"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Close Cash Drawer Modal */}
      <Modal isOpen={isCloseDrawerModalOpen} onClose={() => setIsCloseDrawerModalOpen(false)} title="Close Cash Drawer Session">
        <form onSubmit={handleCloseDrawerSubmit} className="space-y-6 py-4">
          <CurrencyInput
            label="Enter Actual Cash Balance in Drawer (IDR)"
            value={drawerActualBalance}
            onChange={(val) => setDrawerActualBalance(val)}
            placeholder="1.500.000"
            min={0}
            required
          />

          <p className="text-xs text-zinc-400 leading-relaxed">
            Upon submitting, the system will calculate the expected sales balance against your cash count and record the overage/shortage variance.
          </p>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsCloseDrawerModalOpen(false)}
              className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClosingDrawer}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-zinc-350 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-2"
            >
              {isClosingDrawer ? <Spinner className="w-4 h-4" /> : "Close Drawer & Submit"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
