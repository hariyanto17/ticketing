import { useState, useEffect, useRef } from "react";
import { Movie } from "@/services/movieApi";
import { Schedule, ShowtimeSeat } from "@/services/studioApi";
import {
  openCustomerDisplayWindow,
  CUSTOMER_DISPLAY_CHANNEL_NAME,
  CustomerDisplayMessage,
  CustomerDisplayStatePayload,
} from "@/lib/customerDisplay";

interface UseCustomerDisplaySyncProps {
  selectedMovie: Movie | null;
  selectedSchedule: Schedule | null;
  showtimeSeats: ShowtimeSeat[];
  selectedSeats: ShowtimeSeat[];
  quantity: number;
  ticketPrice: number;
  totalAmount: number;
  theme: string;
  locale: string;
  toastSuccess: (msg: string) => void;
  toastError: (msg: string) => void;
  t: (key: string) => string;
}

export function useCustomerDisplaySync({
  selectedMovie,
  selectedSchedule,
  showtimeSeats,
  selectedSeats,
  quantity,
  ticketPrice,
  totalAmount,
  theme,
  locale,
  toastSuccess,
  toastError,
  t,
}: UseCustomerDisplaySyncProps) {
  const customerWindowRef = useRef<Window | null>(null);
  const [isCustomerDisplayConnected, setIsCustomerDisplayConnected] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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
      seats: showtimeSeats,
      selectedSeats: selectedSeats,
      quantity,
      ticketPrice,
      totalAmount,
      theme: (theme as any) || "system",
      locale: (locale as any) || "id",
      lastUpdated: Date.now(),
    };
  };

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
      } else if (data.type === "CUSTOMER_DISPLAY_PING" || data.type === "CUSTOMER_DISPLAY_PONG") {
        setIsCustomerDisplayConnected(true);
        if (data.type === "CUSTOMER_DISPLAY_PING") {
          channel.postMessage({ type: "CUSTOMER_DISPLAY_PONG" });
        }
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
  }, [selectedMovie, selectedSchedule, showtimeSeats, selectedSeats, ticketPrice, totalAmount, theme, locale]);

  useEffect(() => {
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: "CUSTOMER_DISPLAY_STATE",
        payload: getCustomerDisplayPayload(),
      });
    }
  }, [selectedMovie, selectedSchedule, showtimeSeats, selectedSeats, ticketPrice, totalAmount, theme, locale]);

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

  return {
    isCustomerDisplayConnected,
    handleOpenCustomerDisplay,
  };
}
