"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  CUSTOMER_DISPLAY_CHANNEL_NAME,
  CustomerDisplayMessage,
  CustomerDisplayStatePayload,
} from "@/lib/customerDisplay";
import { useTranslation } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { useGetSchedulesQuery, useGetStudiosQuery, Schedule } from "@/services/studioApi";
import { CustomerDisplayHeader } from "@/components/customer-display/CustomerDisplayHeader";
import { CustomerDisplayStandbyBoard } from "@/components/customer-display/CustomerDisplayStandbyBoard";
import { CustomerDisplaySeatMatrix } from "@/components/customer-display/CustomerDisplaySeatMatrix";
import { CustomerDisplayOrderPanel } from "@/components/customer-display/CustomerDisplayOrderPanel";

export default function CustomerDisplayPage() {
  const { t, formatDate, formatCurrency, setLocale, locale } = useTranslation();
  const { setTheme, theme: currentTheme } = useTheme();

  const [displayState, setDisplayState] = useState<CustomerDisplayStatePayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Today's date string in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch today's schedules & studios for standby schedule board
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetSchedulesQuery(
    { status: "PUBLISHED", startDate: todayStr, endDate: todayStr },
    { pollingInterval: 15000 }
  );

  const { data: studiosResponse, isLoading: studiosLoading } = useGetStudiosQuery(
    { limit: 100 }
  );

  // Group schedules strictly by studio
  const groupedStudioSchedules = useMemo(() => {
    const rawSchedules = schedulesResponse?.data || [];
    const rawStudios = studiosResponse?.data || [];

    const studioMap: Record<string, { studio: any; schedules: Schedule[] }> = {};

    rawStudios.forEach((st) => {
      studioMap[st.id] = { studio: st, schedules: [] };
    });

    rawSchedules.forEach((s) => {
      if (studioMap[s.studioId]) {
        studioMap[s.studioId].schedules.push(s);
      } else {
        studioMap[s.studioId] = {
          studio: s.studio || { id: s.studioId, name: "Studio", code: "-", type: "REGULAR" },
          schedules: [s],
        };
      }
    });

    // Sort showtimes inside each studio chronologically
    Object.values(studioMap).forEach((group) => {
      group.schedules.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });

    // Filter only studios that have active schedules, sorted by studio name
    return Object.values(studioMap)
      .filter((group) => group.schedules.length > 0)
      .sort((a, b) => (a.studio?.name || "").localeCompare(b.studio?.name || "", undefined, { numeric: true }));
  }, [schedulesResponse?.data, studiosResponse?.data]);

  const localeRef = useRef(locale);
  const themeRef = useRef(currentTheme);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  // Sync theme changes across tabs/windows via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue as any);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [setTheme]);

  // Broadcast Channel connection & synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    let heartbeatTimeout: NodeJS.Timeout | null = null;

    const resetHeartbeat = () => {
      setIsConnected(true);
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      heartbeatTimeout = setTimeout(() => {
        setIsConnected(false);
      }, 5000);
    };

    try {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL_NAME);

      channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
        const msg = event.data;
        if (!msg || !msg.type) return;

        resetHeartbeat();

        switch (msg.type) {
          case "CUSTOMER_DISPLAY_STATE":
            if (msg.payload) {
              setDisplayState(msg.payload);
              if (msg.payload.locale && msg.payload.locale !== localeRef.current) {
                setLocale(msg.payload.locale);
              }
              if (msg.payload.theme && msg.payload.theme !== themeRef.current) {
                setTheme(msg.payload.theme);
              }
            }
            break;
          case "CUSTOMER_DISPLAY_PING":
            channel?.postMessage({ type: "CUSTOMER_DISPLAY_PONG" });
            break;
          case "CUSTOMER_DISPLAY_CLOSED":
            setDisplayState(null);
            break;
        }
      };

      // Request initial state upon mount
      channel.postMessage({
        type: "CUSTOMER_DISPLAY_REQUEST_STATE",
      } as CustomerDisplayMessage);
    } catch (e) {
      console.warn("BroadcastChannel not supported or error initializing:", e);
    }

    return () => {
      if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
      if (channel) {
        channel.close();
      }
    };
  }, [setLocale, setTheme]);

  const schedule = displayState?.schedule;
  const movie = displayState?.movie;
  const seats = displayState?.seats || [];
  const selectedSeats = displayState?.selectedSeats || [];
  const totalAmount = displayState?.totalAmount || 0;
  const ticketPrice = displayState?.ticketPrice || 0;
  const quantity = displayState?.quantity || 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none font-sans">
      {/* 1. TOP HEADER */}
      <CustomerDisplayHeader
        isConnected={isConnected}
        activeMovieTitle={movie?.title}
        activeStudioName={schedule?.studioName}
      />

      {/* 2. MAIN VIEWPORT */}
      <main className="flex-1 min-h-0 w-full max-w-[1920px] mx-auto p-3 sm:p-4 xl:p-6 flex flex-col items-center justify-start overflow-y-auto">
        {!schedule || !movie ? (
          <CustomerDisplayStandbyBoard
            schedulesLoading={schedulesLoading || studiosLoading}
            groupedStudioSchedules={groupedStudioSchedules}
          />
        ) : (
          <div className="w-full h-full flex flex-col lg:flex-row gap-4 xl:gap-5 items-stretch overflow-hidden">
            {/* Seat Matrix */}
            <CustomerDisplaySeatMatrix
              studioName={schedule.studioName}
              showtimeSeats={seats as any}
              selectedSeats={selectedSeats as any}
            />

            {/* Order Panel */}
            <CustomerDisplayOrderPanel
              movie={movie}
              schedule={schedule}
              selectedSeats={selectedSeats}
              quantity={quantity}
              ticketPrice={ticketPrice}
              totalAmount={totalAmount}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              t={t}
            />
          </div>
        )}
      </main>

      {/* 3. FOOTER */}
      <footer className="h-8 sm:h-9 shrink-0 w-full bg-white/80 dark:bg-zinc-900/80 border-t border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 flex items-center justify-center text-[10px] sm:text-[11px] text-zinc-500 transition-colors duration-200 truncate">
        Planet Cinema POS Customer View • Realtime Multi-Monitor Integration
      </footer>
    </div>
  );
}
