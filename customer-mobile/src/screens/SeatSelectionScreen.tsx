import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { PinchGestureHandlerGestureEvent, HandlerStateChangeEvent, State } from "react-native-gesture-handler";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { ShowtimeSeat } from "../types/schedule";
import { useGetScheduleSeatsQuery } from "../lib/api/scheduleApi";
import { useHoldSeatsMutation, useReleaseSeatsMutation } from "../lib/api/bookingApi";
import { initSocket } from "../services/socketService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useAlert } from "../context/AlertContext";
import { Header } from "../components/common/Header";
import { CinemaScreen } from "../components/seat/CinemaScreen";
import { SeatLegend } from "../components/seat/SeatLegend";
import { HoldTimer } from "../components/seat/HoldTimer";
import { NonRefundableBanner } from "../components/common/NonRefundableBanner";
import { SeatZoomToolbar } from "../components/seat/SeatZoomToolbar";
import { SeatMatrixCanvas } from "../components/seat/SeatMatrixCanvas";
import { SeatBottomBar } from "../components/seat/SeatBottomBar";

type SeatSelectionRouteProp = RouteProp<RootStackParamList, "SeatSelection">;
type SeatSelectionNavProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

export const SeatSelectionScreen: React.FC = () => {
  const navigation = useNavigation<SeatSelectionNavProp>();
  const route = useRoute<SeatSelectionRouteProp>();
  const {
    selectedSeats,
    toggleSeat,
    clearSelectedSeats,
    reservedUntil,
    setReservedUntil,
    ticketSubtotal,
  } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();
  const { showAlert } = useAlert();

  const schedule = route.params.schedule;

  // Zoom scale state (1.0 = auto-fit to screen, up to 2.2x zoom)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const baseScaleRef = useRef<number>(1.0);

  const handlePinchGestureEvent = (event: PinchGestureHandlerGestureEvent) => {
    const scale = event.nativeEvent.scale;
    const nextLevel = Math.max(1.0, Math.min(2.5, +(baseScaleRef.current * scale).toFixed(2)));
    setZoomLevel(nextLevel);
  };

  const handlePinchStateChange = (event: HandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE || event.nativeEvent.state === State.END) {
      baseScaleRef.current = zoomLevel;
    }
  };

  // RTK Query: Seat matrix & Hold/Release mutations
  const {
    data: serverSeats = [],
    isLoading: loading,
    refetch: loadSeats,
  } = useGetScheduleSeatsQuery(schedule.id);

  const [holdSeatsMutation, { isLoading: holding }] = useHoldSeatsMutation();
  const [releaseSeatsMutation] = useReleaseSeatsMutation();

  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);

  useEffect(() => {
    if (serverSeats.length > 0) {
      setSeats(serverSeats);
    }
  }, [serverSeats]);

  const isProceedingRef = useRef(false);
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  useFocusEffect(
    useCallback(() => {
      isProceedingRef.current = false;
      setZoomLevel(1.0);
      loadSeats();
    }, [schedule.id])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      if (isProceedingRef.current) {
        return;
      }

      const currentSeats = selectedSeatsRef.current;
      if (currentSeats.length > 0) {
        const seatIds = currentSeats.map((s) => s.seatId || s.seat?.id || s.id);
        releaseSeatsMutation({ scheduleId: schedule.id, seatIds }).catch(() => {});
        clearSelectedSeats();
      }
    });

    return unsubscribe;
  }, [navigation, schedule.id, releaseSeatsMutation, clearSelectedSeats]);

  useEffect(() => {
    // Initialize Socket.IO Real-time Synchronization
    const socket = initSocket();

    const handleSeatsHeld = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "HOLD" } : s
          )
        );
      }
    };

    const handleSeatsReleased = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "AVAILABLE" } : s
          )
        );
      }
    };

    const handleSeatsSold = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "SOLD" } : s
          )
        );
      }
    };

    socket.on("seats_held", handleSeatsHeld);
    socket.on("seats_released", handleSeatsReleased);
    socket.on("seats_sold", handleSeatsSold);

    return () => {
      socket.off("seats_held", handleSeatsHeld);
      socket.off("seats_released", handleSeatsReleased);
      socket.off("seats_sold", handleSeatsSold);
    };
  }, [schedule.id]);

  // Handle Hold Expiry
  const handleHoldExpired = () => {
    const currentSeats = selectedSeatsRef.current;
    if (currentSeats.length > 0) {
      const seatIds = currentSeats.map((s) => s.seatId || s.seat?.id || s.id);
      releaseSeatsMutation({ scheduleId: schedule.id, seatIds }).catch(() => {});
      clearSelectedSeats();
    }
    loadSeats();
    showAlert(t("seat.timerExpired"), t("seat.timerExpired"), [{ text: "OK" }], "warning");
  };

  // Group seats by Row (ordered K -> A from screen down) and compute auto-fit size + zoom
  const { rowList, maxColumn, seatSize } = useMemo(() => {
    const rowsMap: Record<string, Record<number, ShowtimeSeat>> = {};
    let maxCol = 1;

    for (const s of seats) {
      const row = s.seat.row;
      const col = s.seat.column;
      if (!rowsMap[row]) {
        rowsMap[row] = {};
      }
      rowsMap[row][col] = s;
      if (col > maxCol) maxCol = col;
    }

    const getRowIndex = (row: string): number => {
      let index = 0;
      for (let i = 0; i < row.length; i++) {
        index = index * 26 + (row.charCodeAt(i) - 64);
      }
      return index - 1;
    };

    const sortedRows = Object.keys(rowsMap).sort((a, b) => getRowIndex(b) - getRowIndex(a));
    const availableWidthForCols = Math.max(160, width - 64);
    const fitSize = Math.max(13, Math.min(32, Math.floor(availableWidthForCols / Math.max(1, maxCol)) - 3));
    const computedSize = Math.round(fitSize * zoomLevel);

    return {
      rowList: sortedRows.map((r) => ({ rowName: r, cols: rowsMap[r] })),
      maxColumn: maxCol,
      seatSize: computedSize,
    };
  }, [seats, zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.2, +(prev + 0.3).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(1.0, +(prev - 0.3).toFixed(1)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleSeatPress = async (seat: ShowtimeSeat) => {
    const isAlreadySelected = selectedSeats.some(
      (s) => s.seatId === seat.seatId || s.id === seat.id
    );

    if (seat.status !== "AVAILABLE" && !isAlreadySelected) {
      if (seat.status === "HOLD") {
        showAlert(t("seat.held"), t("seat.heldWarning"), [{ text: "OK" }], "warning");
      } else if (seat.status === "SOLD") {
        showAlert(t("seat.sold"), t("seat.soldWarning"), [{ text: "OK" }], "error");
      }
      return;
    }

    const seatIdToHold = seat.seatId || seat.seat?.id || seat.id;

    try {
      if (isAlreadySelected) {
        toggleSeat(seat);
        await releaseSeatsMutation({ scheduleId: schedule.id, seatIds: [seatIdToHold] }).unwrap();
      } else {
        if (selectedSeats.length >= 8) {
          showAlert(t("seat.title"), "Maksimal 8 kursi dalam satu transaksi.", [{ text: "OK" }], "warning");
          return;
        }
        const res = await holdSeatsMutation({ scheduleId: schedule.id, seatIds: [seatIdToHold] }).unwrap();
        if (res.reservedUntil) {
          setReservedUntil(new Date(res.reservedUntil));
        }
        toggleSeat(seat);
      }
    } catch (err: any) {
      showAlert(
        t("common.error"),
        err?.data?.message || err?.message || "Kursi yang Anda pilih baru saja dipesan oleh kasir atau pengguna lain. Silakan pilih kursi lain.",
        [{ text: "OK", onPress: () => loadSeats() }],
        "error"
      );
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHoldAndProceed = async () => {
    if (selectedSeats.length === 0) {
      showAlert(t("seat.title"), t("seat.selectAtLeastOne"), [{ text: "OK" }], "warning");
      return;
    }

    isProceedingRef.current = true;
    navigation.navigate("BookingSummary");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${schedule.movie?.title || "Film"} • ${schedule.studio?.name || "Studio"}`}
        showBack
        onBack={handleBack}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t("common.loading")}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Active Hold Countdown Timer */}
          {reservedUntil && (
            <HoldTimer reservedUntil={reservedUntil} onExpired={handleHoldExpired} />
          )}

          {/* Screen Curve representation */}
          <CinemaScreen />

          {/* Zoom Toolbar */}
          <SeatZoomToolbar
            zoomLevel={zoomLevel}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetZoom={handleResetZoom}
            colors={colors}
            t={t}
          />

          {/* Seat Layout Grid */}
          <SeatMatrixCanvas
            rowList={rowList}
            maxColumn={maxColumn}
            seatSize={seatSize}
            zoomLevel={zoomLevel}
            selectedSeats={selectedSeats}
            onSeatPress={handleSeatPress}
            onPinchGestureEvent={handlePinchGestureEvent}
            onPinchStateChange={handlePinchStateChange}
            colors={colors}
          />

          {/* Legend */}
          <SeatLegend />
        </ScrollView>
      )}

      {/* Sticky Non-Refundable Announcement */}
      <NonRefundableBanner compact />

      {/* Selected Seats summary footer */}
      <SeatBottomBar
        selectedSeats={selectedSeats}
        ticketSubtotal={ticketSubtotal}
        formatCurrency={formatCurrency}
        t={t}
        onProceed={handleHoldAndProceed}
        holding={holding}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
});
