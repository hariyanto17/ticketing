"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  useGetPublicSeatsQuery,
  useHoldPublicSeatsMutation,
  useReleasePublicSeatsMutation,
  useCreateBookingMutation,
  useGetPublicSchedulesQuery,
  useGetPublicConfigQuery,
} from "@/services/bookingApi";
import { ShowtimeSeat } from "@/services/studioApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { io } from "socket.io-client";
import { SOCKET_BASE_URL } from "@/lib/api/api";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";

// Modular Subcomponents
import { CheckoutMovieHeader } from "@/components/checkout/CheckoutMovieHeader";
import { CheckoutSeatMatrix } from "@/components/checkout/CheckoutSeatMatrix";
import { CheckoutCustomerForm } from "@/components/checkout/CheckoutCustomerForm";

function GuestCheckout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scheduleId = searchParams.get("scheduleId") || "";

  const { success: toastSuccess, error: toastError } = useToast();

  // Queries
  const { data: configResponse } = useGetPublicConfigQuery();
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetPublicSchedulesQuery(undefined, {
    skip: !scheduleId,
  });
  const { data: seatsResponse, isLoading: seatsLoading, refetch: refetchSeats } = useGetPublicSeatsQuery(
    scheduleId,
    { skip: !scheduleId }
  );

  const [holdSeats] = useHoldPublicSeatsMutation();
  const [releaseSeats] = useReleasePublicSeatsMutation();
  const [createBooking, { isLoading: isSubmitting }] = useCreateBookingMutation();

  const activeSchedule = useMemo(() => {
    return schedulesResponse?.data?.find((s) => s.id === scheduleId) || null;
  }, [schedulesResponse?.data, scheduleId]);

  const ticketPrice = activeSchedule?.ticketPrice || 0;
  const onlineFeePerTicket =
    configResponse?.onlineServiceFee !== undefined ? Number(configResponse.onlineServiceFee) : 4000;

  // Selected seats state
  const [selectedSeats, setSelectedSeats] = useState<ShowtimeSeat[]>([]);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  const selectedSeatsRef = useRef<ShowtimeSeat[]>([]);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    return () => {
      if (scheduleId && selectedSeatsRef.current.length > 0) {
        releaseSeats({
          scheduleId,
          seatIds: selectedSeatsRef.current.map((s) => s.seatId),
        });
      }
    };
  }, [scheduleId, releaseSeats]);

  useEffect(() => {
    if (!scheduleId) return;

    const socket = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socket.emit("join_showtime", scheduleId);

    const handleUpdate = () => {
      refetchSeats();
    };

    socket.on("seat_update", handleUpdate);
    socket.on("seats_held", handleUpdate);
    socket.on("seats_released", handleUpdate);
    socket.on("seats_sold", handleUpdate);
    socket.on("order_updated", handleUpdate);

    return () => {
      socket.emit("leave_showtime", scheduleId);
      socket.disconnect();
    };
  }, [scheduleId, refetchSeats]);

  const showtimeSeats = useMemo(() => seatsResponse?.data || [], [seatsResponse?.data]);

  const handleSeatClick = async (seat: ShowtimeSeat) => {
    if (seat.status === "SOLD" || seat.status === "DISABLED") return;

    const isAlreadySelected = selectedSeats.some((s) => s.id === seat.id);

    try {
      if (isAlreadySelected) {
        await releaseSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
      } else {
        if (selectedSeats.length >= 8) {
          toastError("Maksimal pemesanan tiket per transaksi adalah 8 kursi.");
          return;
        }
        await holdSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
        setSelectedSeats((prev) => [...prev, seat]);
      }
    } catch (err: any) {
      toastError(err?.data?.message || "Gagal mengunci kursi. Silakan coba kembali.");
    }
  };

  const handleRemoveSeat = async (seat: ShowtimeSeat) => {
    try {
      await releaseSeats({ scheduleId, seatIds: [seat.seatId] }).unwrap();
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    } catch {
      setSelectedSeats((prev) => prev.filter((s) => s.id !== seat.id));
    }
  };

  const handleClearAllSeats = () => {
    if (selectedSeats.length > 0) {
      releaseSeats({ scheduleId, seatIds: selectedSeats.map((s) => s.seatId) });
      setSelectedSeats([]);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSeats.length === 0) {
      toastError("Silakan pilih minimal 1 kursi sebelum melanjutkan.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      toastError("Mohon lengkapi Nama Lengkap dan Nomor WhatsApp/HP.");
      return;
    }

    try {
      const response = (await createBooking({
        scheduleId,
        seatIds: selectedSeats.map((s) => s.seatId),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
      }).unwrap()) as any;

      if (response?.snapRedirectUrl || response?.order?.snapRedirectUrl) {
        window.location.href = response.snapRedirectUrl || response.order.snapRedirectUrl;
      } else if (response?.order?.id || response?.id) {
        router.push(`/bookings/${response.order?.id || response.id}/success`);
      } else {
        toastSuccess("Pemesanan berhasil dibuat!");
      }
    } catch (err: any) {
      toastError(err?.data?.message || "Gagal memproses pemesanan tiket.");
    }
  };

  if (!scheduleId) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <p className="text-zinc-500 mb-4">Jadwal tidak ditemukan.</p>
        <Link href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-16">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/" className="flex items-center pl-1">
              <img
                src="/PLANET-CINEMA-LOGO-2-COLOR.png"
                alt="Planet Cinema"
                className="h-7 w-auto object-contain"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
        <CheckoutMovieHeader schedule={activeSchedule} ticketPrice={ticketPrice} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <CheckoutSeatMatrix
            schedule={activeSchedule}
            showtimeSeats={showtimeSeats}
            selectedSeats={selectedSeats}
            onSeatClick={handleSeatClick}
          />

          <CheckoutCustomerForm
            selectedSeats={selectedSeats}
            onRemoveSeat={handleRemoveSeat}
            onClearAllSeats={handleClearAllSeats}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerEmail={customerEmail}
            setCustomerEmail={setCustomerEmail}
            ticketPrice={ticketPrice}
            onlineFeePerTicket={onlineFeePerTicket}
            isSubmitting={isSubmitting}
            onSubmit={handleCheckoutSubmit}
          />
        </div>
      </main>
    </div>
  );
}

export default function BookingCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
          <Spinner className="w-8 h-8 text-indigo-600" />
        </div>
      }
    >
      <GuestCheckout />
    </Suspense>
  );
}
