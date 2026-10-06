"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useGetMoviesQuery, Movie } from "@/services/movieApi";
import {
  useGetSchedulesQuery,
  useGetScheduleSeatsQuery,
  useHoldSeatsMutation,
  useReleaseSeatsMutation,
  Schedule,
  ShowtimeSeat,
} from "@/services/studioApi";
import { useCheckoutOrderMutation } from "@/services/orderApi";
import { PaymentMethod } from "@/lib/api/orderApi";
import { useGetActivePromotionsQuery, Promotion } from "@/services/promotionApi";
import { useToast } from "@/components/ui/toast";
import { io } from "socket.io-client";
import { API_BASE_URL, SOCKET_BASE_URL } from "@/lib/api/api";
import {
  useGetActiveDrawerQuery,
  useOpenDrawerMutation,
  useCloseDrawerMutation,
} from "@/services/opsApi";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

// Sub-components & Helpers
import { CashierTopBar } from "@/components/pos/CashierTopBar";
import { DrawerSessionBanner } from "@/components/pos/DrawerSessionBanner";
import { CashierMovieSelector } from "@/components/pos/CashierMovieSelector";
import { CashierScheduleSelector } from "@/components/pos/CashierScheduleSelector";
import { CashierSeatMatrix } from "@/components/pos/CashierSeatMatrix";
import { CashierOrderSummary } from "@/components/pos/CashierOrderSummary";
import { CashierDrawerModals } from "@/components/pos/CashierDrawerModals";
import { filterTodayTomorrowSchedules, calculatePromoDiscount } from "@/components/pos/cashierPromoCalculations";
import { printTicketsViaAgent } from "@/components/pos/cashierPrintHelper";
import { useCustomerDisplaySync } from "@/components/pos/useCustomerDisplaySync";

export default function CashierWorkspace() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { t, locale } = useTranslation();
  const { theme } = useTheme();

  // Cash drawer hooks & local state
  const { data: activeDrawer, isLoading: drawerLoading, refetch: refetchActiveDrawer } = useGetActiveDrawerQuery();
  const [openDrawer, { isLoading: isOpeningDrawer }] = useOpenDrawerMutation();
  const [closeDrawer, { isLoading: isClosingDrawer }] = useCloseDrawerMutation();
  const [drawerOpeningBalance, setDrawerOpeningBalance] = useState<number>(0);
  const [drawerActualBalance, setDrawerActualBalance] = useState<number>(0);
  const [drawerNotes, setDrawerNotes] = useState<string>("");
  const [isOpenDrawerModalOpen, setIsOpenDrawerModalOpen] = useState(false);
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false);
  const [drawerSummary, setDrawerSummary] = useState<any | null>(null);
  const hasPromptedDrawerRef = useRef(false);

  // Auto-prompt to open cash drawer once if there is no active session
  useEffect(() => {
    if (!drawerLoading && activeDrawer === null && !hasPromptedDrawerRef.current) {
      hasPromptedDrawerRef.current = true;
      setIsOpenDrawerModalOpen(true);
    }
  }, [drawerLoading, activeDrawer]);

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
  const [, setLastSelectedSeats] = useState<ShowtimeSeat[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [amountReceived, setAmountReceived] = useState<number | "">("");
  const [, setCheckoutResult] = useState<any | null>(null);

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Queries
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

  const { todaySchedules, tomorrowSchedules } = useMemo(
    () => filterTodayTomorrowSchedules(schedulesResponse?.data),
    [schedulesResponse?.data]
  );

  const { data: seatsResponse, isLoading: seatsLoading, refetch: refetchSeats } = useGetScheduleSeatsQuery(
    selectedSchedule?.id || "",
    { skip: !selectedSchedule }
  );

  // Mutations
  const [holdSeats] = useHoldSeatsMutation();
  const [releaseSeats] = useReleaseSeatsMutation();
  const [checkoutOrder, { isLoading: isCheckingOut }] = useCheckoutOrderMutation();

  const selectedScheduleRef = useRef<Schedule | null>(null);
  const selectedSeatsRef = useRef<ShowtimeSeat[]>([]);

  useEffect(() => {
    selectedScheduleRef.current = selectedSchedule;
  }, [selectedSchedule]);

  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

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

    socket.emit("join_showtime", selectedSchedule.id);

    const handleSeatEvent = (data: any) => {
      if (data?.showtimeId === selectedSchedule.id || data?.scheduleId === selectedSchedule.id) {
        refetchSeats();
      }
    };

    socket.on("seat_update", handleSeatEvent);
    socket.on("seats_held", handleSeatEvent);
    socket.on("seats_released", handleSeatEvent);
    socket.on("seats_sold", handleSeatEvent);
    socket.on("order_updated", handleSeatEvent);

    return () => {
      socket.emit("leave_showtime", selectedSchedule.id);
      socket.disconnect();
    };
  }, [selectedSchedule?.id, refetchSeats]);

  // Clean up seats on unmount & page unload
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

  useEffect(() => {
    const handlePageUnload = () => {
      const targetScheduleId = selectedScheduleRef.current?.id;
      const targetSeats = selectedSeatsRef.current;
      if (targetScheduleId && targetSeats && targetSeats.length > 0) {
        const payload = JSON.stringify({ seatIds: targetSeats.map((s) => s.seatId) });
        navigator.sendBeacon(
          `${API_BASE_URL}/schedules/${targetScheduleId}/release`,
          new Blob([payload], { type: "application/json" })
        );
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
  }, [moviesError, toastError, t]);

  const handleMovieSelect = async (movie: Movie | null) => {
    if (selectedSchedule && selectedSeats.length > 0) {
      await releaseHeldSeatsSafely(selectedSchedule.id, selectedSeats);
    }
    setSelectedMovie(movie);
    setSelectedSchedule(null);
    setSelectedSeats([]);
    setSelectedPromo(null);
  };

  const handleScheduleSelect = async (sched: Schedule) => {
    if (selectedSchedule && selectedSeats.length > 0 && selectedSchedule.id !== sched.id) {
      await releaseHeldSeatsSafely(selectedSchedule.id, selectedSeats);
    }
    setSelectedSchedule(sched);
    setSelectedSeats([]);
  };

  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === "SOLD" || seat.status === "DISABLED") return;

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    try {
      if (isAlreadySelected) {
        await releaseSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      } else {
        await holdSeats({ scheduleId: selectedSchedule!.id, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => [...prev, seat]);
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

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
      const summary = await closeDrawer({ actualBalance: drawerActualBalance, notes: drawerNotes }).unwrap();
      setDrawerSummary(summary);
      await refetchActiveDrawer();
      toastSuccess(t("cashier.drawerClosed"));
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.drawerFailed"));
    }
  };

  // Promotions State & Queries
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const { data: activePromosResponse } = useGetActivePromotionsQuery(
    { movieId: selectedMovie?.id },
    { skip: !selectedMovie }
  );
  const activePromos = useMemo(() => activePromosResponse?.data || [], [activePromosResponse?.data]);

  // Calculations
  const ticketPrice = selectedSchedule?.ticketPrice || 0;
  const quantity = selectedSeats.length;
  const subtotal = quantity * ticketPrice;

  const { promoDiscount, freeTicketsCount, totalAmount } = useMemo(
    () => calculatePromoDiscount({ selectedPromo, quantity, ticketPrice, subtotal }),
    [selectedPromo, quantity, ticketPrice, subtotal]
  );

  const change =
    amountReceived !== "" && Number(amountReceived) >= totalAmount ? Number(amountReceived) - totalAmount : 0;

  const showtimeSeats = useMemo(() => seatsResponse?.data || [], [seatsResponse?.data]);

  // Secondary Customer Display
  const { isCustomerDisplayConnected, handleOpenCustomerDisplay } = useCustomerDisplaySync({
    selectedMovie,
    selectedSchedule,
    showtimeSeats,
    selectedSeats,
    quantity,
    ticketPrice,
    totalAmount,
    theme: (theme as any) || "system",
    locale: (locale as any) || "id",
    toastSuccess,
    toastError,
    t,
  });

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
        promotionId: selectedPromo ? selectedPromo.id : null,
      }).unwrap();

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

      const finalResult = {
        ...response.data,
        tickets: enrichedTickets,
      };

      setCheckoutResult(finalResult);
      toastSuccess(t("cashier.transactionSuccess"));

      setSelectedSeats([]);
      setSelectedPromo(null);
      setAmountReceived("");

      void printTicketsViaAgent({
        order: finalResult.order,
        tickets: enrichedTickets,
        schedule: selectedSchedule,
        seatsToUse: seatsSnapshot,
        toastSuccess,
        toastError,
      });
    } catch (err: any) {
      toastError(err?.data?.message || t("cashier.checkoutFailed"));
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 font-sans items-start">
      <CashierTopBar
        isCustomerDisplayConnected={isCustomerDisplayConnected}
        onOpenCustomerDisplay={handleOpenCustomerDisplay}
      />

      <DrawerSessionBanner
        drawerLoading={drawerLoading}
        activeDrawer={activeDrawer}
        onOpenDrawerClick={() => setIsOpenDrawerModalOpen(true)}
        onCloseDrawerClick={() => {
          setDrawerActualBalance(0);
          setIsCloseDrawerModalOpen(true);
        }}
      />

      {/* LEFT PANEL */}
      <div className="xl:col-span-8 space-y-6">
        <CashierMovieSelector
          movies={moviesResponse?.data}
          isLoading={moviesLoading}
          selectedMovie={selectedMovie}
          onSelectMovie={handleMovieSelect}
        />

        {selectedMovie && (
          <CashierScheduleSelector
            isLoading={schedulesLoading}
            todaySchedules={todaySchedules}
            tomorrowSchedules={tomorrowSchedules}
            showTomorrow={showTomorrow}
            setShowTomorrow={setShowTomorrow}
            selectedSchedule={selectedSchedule}
            onSelectSchedule={handleScheduleSelect}
          />
        )}

        {selectedSchedule && (
          <CashierSeatMatrix
            selectedSchedule={selectedSchedule}
            showtimeSeats={showtimeSeats}
            seatsLoading={seatsLoading}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
          />
        )}
      </div>

      {/* RIGHT PANEL: BILLING & CHECKOUT */}
      <CashierOrderSummary
        drawerLoading={drawerLoading}
        activeDrawer={activeDrawer}
        drawerOpeningBalance={drawerOpeningBalance}
        setDrawerOpeningBalance={setDrawerOpeningBalance}
        isOpeningDrawer={isOpeningDrawer}
        onOpenDrawerSubmit={handleOpenDrawerSubmit}
        onOpenCloseModal={() => setIsCloseDrawerModalOpen(true)}
        selectedMovie={selectedMovie}
        selectedSchedule={selectedSchedule}
        selectedSeats={selectedSeats}
        onClearSelection={handleClearSelection}
        activePromos={activePromos}
        selectedPromo={selectedPromo}
        setSelectedPromo={setSelectedPromo}
        ticketPrice={ticketPrice}
        quantity={quantity}
        promoDiscount={promoDiscount}
        freeTicketsCount={freeTicketsCount}
        totalAmount={totalAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        amountReceived={amountReceived}
        setAmountReceived={setAmountReceived}
        change={change}
        isCheckingOut={isCheckingOut}
        onCheckoutSubmit={handleCheckoutSubmit}
      />

      {/* Cash Drawer Modals */}
      <CashierDrawerModals
        isOpenDrawerModalOpen={isOpenDrawerModalOpen}
        setIsOpenDrawerModalOpen={setIsOpenDrawerModalOpen}
        isCloseDrawerModalOpen={isCloseDrawerModalOpen}
        setIsCloseDrawerModalOpen={setIsCloseDrawerModalOpen}
        drawerOpeningBalance={drawerOpeningBalance}
        setDrawerOpeningBalance={setDrawerOpeningBalance}
        drawerActualBalance={drawerActualBalance}
        setDrawerActualBalance={setDrawerActualBalance}
        drawerNotes={drawerNotes}
        setDrawerNotes={setDrawerNotes}
        isOpeningDrawer={isOpeningDrawer}
        isClosingDrawer={isClosingDrawer}
        onOpenDrawerSubmit={handleOpenDrawerSubmit}
        onCloseDrawerSubmit={handleCloseDrawerSubmit}
        drawerSummary={drawerSummary}
        onCloseSummary={() => {
          setDrawerSummary(null);
          setDrawerActualBalance(0);
          setDrawerNotes("");
        }}
      />
    </div>
  );
}
