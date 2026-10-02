import React, { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { useLazyGetPaymentStatusQuery } from "../lib/api/paymentApi";
import { storageService } from "../services/storageService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useAlert } from "../context/AlertContext";
import { Header } from "../components/common/Header";
import { Button } from "../components/common/Button";
import { useAppDispatch, addRecentBooking } from "../lib/store";
import { QrisDisplayCard } from "../components/payment/QrisDisplayCard";
import { PaymentResultView } from "../components/payment/PaymentResultView";

type PaymentScreenRouteProp = RouteProp<RootStackParamList, "Payment">;
type PaymentScreenNavProp = StackNavigationProp<RootStackParamList>;

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const dispatch = useAppDispatch();
  const { resetBooking, selectedSchedule, selectedSeats, customerInfo, estimatedTotal } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();
  const { showAlert } = useAlert();

  const { orderId, qrUrl, qrString, amount, expiredAt: rawExpiredAt } = route.params;

  const [triggerGetPaymentStatus, { isFetching: checkingStatus }] = useLazyGetPaymentStatusQuery();

  const [paymentState, setPaymentState] = useState<"QRIS" | "VERIFYING" | "SUCCESS" | "FAILED" | "EXPIRED">("QRIS");
  const [bookingNumber, setBookingNumber] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Active QR data state
  const [activeQrUrl, setActiveQrUrl] = useState<string>(qrUrl || "");
  const [activeQrString, setActiveQrString] = useState<string>(qrString || "");

  const totalPayAmount = amount || estimatedTotal || 0;

  // Compute expiration target date
  const targetExpiry = useMemo(() => {
    if (rawExpiredAt) {
      const parsed = new Date(rawExpiredAt).getTime();
      if (!isNaN(parsed) && parsed > Date.now()) {
        return new Date(parsed);
      }
    }
    return new Date(Date.now() + 10 * 60 * 1000);
  }, [rawExpiredAt]);

  // Expiration countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.floor((targetExpiry.getTime() - now) / 1000);
      if (diff <= 0) {
        setRemainingSeconds(0);
        setIsExpired(true);
        setPaymentState("EXPIRED");
      } else {
        setRemainingSeconds(diff);
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [targetExpiry]);

  // Format countdown MM:SS
  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Check & verify payment status with backend (Authoritative)
  const checkPaymentStatus = async (isManualTap = false) => {
    try {
      const res = await triggerGetPaymentStatus(orderId, false).unwrap();

      if (res.qrUrl && !activeQrUrl) setActiveQrUrl(res.qrUrl);
      if (res.qrString && !activeQrString) setActiveQrString(res.qrString);

      if (res.orderStatus === "PAID" || res.paymentStatus === "PAID") {
        setPaymentState("SUCCESS");
        setBookingNumber(res.orderNumber);

        const bookingRef = {
          orderId: res.orderId,
          orderNumber: res.orderNumber,
          customerPhone: customerInfo.phone,
          movieTitle: selectedSchedule?.movie?.title || "Film",
          studioName: selectedSchedule?.studio?.name || "Studio 1",
          startTime: selectedSchedule?.startTime || new Date().toISOString(),
          seatLabels: selectedSeats.map((s) => s.seat.seatLabel),
          createdAt: new Date().toISOString(),
        };

        dispatch(addRecentBooking(bookingRef));
        await storageService.saveBookingRef(bookingRef);

        resetBooking();

        setTimeout(() => {
          navigation.replace("BookingSuccess", {
            orderId: res.orderId,
            bookingNumber: res.orderNumber,
          });
        }, 1200);
        return true;
      }

      if (res.orderStatus === "CANCELLED" || res.paymentStatus === "FAILED") {
        setPaymentState("FAILED");
        return false;
      }

      if (isManualTap) {
        showAlert(
          "Status Pembayaran",
          "Pembayaran Anda sedang diverifikasi. Jika sudah melakukan transfer/scan, mohon tunggu beberapa detik.",
          [{ text: "OK" }],
          "info"
        );
      }
      return false;
    } catch (e) {
      console.error("Failed to check payment status", e);
      return false;
    }
  };

  // Automatic Polling while QRIS screen is active (every 3.5 seconds)
  useEffect(() => {
    if (paymentState !== "QRIS") return;

    const interval = setInterval(() => {
      checkPaymentStatus(false);
    }, 3500);

    return () => clearInterval(interval);
  }, [orderId, paymentState]);

  const handleCancelPayment = () => {
    showAlert(
      "Batalkan Pembayaran",
      "Apakah Anda yakin ingin membatalkan transaksi QRIS ini?",
      [
        { text: "Lanjutkan Pembayaran", style: "cancel" },
        {
          text: "Batalkan",
          style: "destructive",
          onPress: () => {
            resetBooking();
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs" }],
            });
          },
        },
      ],
      "confirm"
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t("payment.title")}
        showBack
        onBack={handleCancelPayment}
      />

      {paymentState === "QRIS" ? (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <QrisDisplayCard
            totalPayAmount={totalPayAmount}
            formatCurrency={formatCurrency}
            isExpired={isExpired}
            remainingSeconds={remainingSeconds}
            formatCountdown={formatCountdown}
            activeQrString={activeQrString}
            activeQrUrl={activeQrUrl}
            colors={colors}
            t={t}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={t("payment.iHavePaid")}
              onPress={() => checkPaymentStatus(true)}
              loading={checkingStatus}
              size="large"
            />

            <Button
              title={t("payment.cancelPayment")}
              variant="outline"
              onPress={handleCancelPayment}
              size="medium"
            />
          </View>
        </ScrollView>
      ) : (
        <PaymentResultView
          paymentState={paymentState}
          totalPayAmount={totalPayAmount}
          bookingNumber={bookingNumber}
          formatCurrency={formatCurrency}
          t={t}
          colors={colors}
          checkingStatus={checkingStatus}
          onCheckStatus={() => checkPaymentStatus(true)}
          onReselect={() => {
            resetBooking();
            navigation.reset({
              index: 0,
              routes: [{ name: "MainTabs" }],
            });
          }}
          onBackToTop={() => navigation.popToTop()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  actionButtons: {
    gap: 10,
    marginTop: 6,
  },
});
