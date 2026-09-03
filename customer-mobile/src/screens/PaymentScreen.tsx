import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WebView } from "react-native-webview";
import { CheckCircle2, XCircle, RefreshCw } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { useLazyGetPaymentStatusQuery } from "../lib/api/paymentApi";
import { storageService } from "../services/storageService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Button } from "../components/common/Button";

type PaymentScreenRouteProp = RouteProp<RootStackParamList, "Payment">;
type PaymentScreenNavProp = StackNavigationProp<RootStackParamList>;

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const { resetBooking, selectedSchedule, selectedSeats, customerInfo } = useBooking();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const { orderId, snapUrl } = route.params;

  const [triggerGetPaymentStatus, { isFetching: checkingStatus }] = useLazyGetPaymentStatusQuery();

  const [paymentState, setPaymentState] = useState<"WEBVIEW" | "VERIFYING" | "SUCCESS" | "FAILED">("WEBVIEW");
  const [bookingNumber, setBookingNumber] = useState<string>("");
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const verifyPaymentWithBackend = async (attempt = 1) => {
    setPaymentState("VERIFYING");

    try {
      const res = await triggerGetPaymentStatus(orderId, false).unwrap();

      if (res.orderStatus === "PAID" || res.paymentStatus === "PAID") {
        setPaymentState("SUCCESS");
        setBookingNumber(res.orderNumber);

        // Save reference in local storage for fast customer ticket retrieval
        await storageService.saveBookingRef({
          orderId: res.orderId,
          orderNumber: res.orderNumber,
          customerPhone: customerInfo.phone,
          movieTitle: selectedSchedule?.movie?.title || "Film",
          studioName: selectedSchedule?.studio?.name || "Studio 1",
          startTime: selectedSchedule?.startTime || new Date().toISOString(),
          seatLabels: selectedSeats.map((s) => s.seat.seatLabel),
          createdAt: new Date().toISOString(),
        });

        // Reset wizard state
        resetBooking();

        // Navigate to BookingSuccessScreen
        setTimeout(() => {
          navigation.replace("BookingSuccess", {
            orderId: res.orderId,
            bookingNumber: res.orderNumber,
          });
        }, 1200);
        return;
      }

      if (res.orderStatus === "CANCELLED" || res.paymentStatus === "FAILED") {
        setPaymentState("FAILED");
        return;
      }

      // If still PENDING and attempts < 6 (polling up to 15s), retry
      if (attempt < 6) {
        setTimeout(() => verifyPaymentWithBackend(attempt + 1), 2500);
      } else {
        setPaymentState("FAILED");
      }
    } catch (e) {
      console.error("Failed to verify payment status", e);
      if (attempt < 4) {
        setTimeout(() => verifyPaymentWithBackend(attempt + 1), 2500);
      } else {
        setPaymentState("FAILED");
      }
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    const url = navState.url || "";
    if (
      url.includes("/finish") ||
      url.includes("/status") ||
      url.includes("status_code=200") ||
      url.includes("transaction_status=settlement")
    ) {
      verifyPaymentWithBackend();
    } else if (
      url.includes("/error") ||
      url.includes("/cancel") ||
      url.includes("transaction_status=expire") ||
      url.includes("transaction_status=cancel")
    ) {
      setPaymentState("FAILED");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t("payment.title")}
        showBack
        onBack={() => {
          Alert.alert(
            t("payment.cancelPayment"),
            "Apakah Anda ingin memeriksa status atau membatalkan pembayaran?",
            [
              { text: "Periksa Status", onPress: () => verifyPaymentWithBackend() },
              { text: "Batalkan", style: "destructive", onPress: () => navigation.goBack() },
            ]
          );
        }}
      />

      {paymentState === "WEBVIEW" ? (
        <View style={styles.webViewContainer}>
          <WebView
            source={{ uri: snapUrl }}
            onNavigationStateChange={handleNavigationStateChange}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  {t("payment.openMidtransPrompt")}
                </Text>
              </View>
            )}
          />
          <View style={[styles.bottomCheckBar, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
            <Button
              title="Sudah Selesai Bayar? Periksa Status"
              onPress={() => verifyPaymentWithBackend()}
              variant="outline"
              size="medium"
            />
          </View>
        </View>
      ) : paymentState === "VERIFYING" ? (
        <View style={styles.statusCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("payment.verifying")}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("payment.verifyingSub")}
          </Text>
        </View>
      ) : paymentState === "SUCCESS" ? (
        <View style={styles.statusCenter}>
          <CheckCircle2 size={64} color={colors.success} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("payment.confirmSuccess")}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            Nomor Pesanan: {bookingNumber}
          </Text>
        </View>
      ) : (
        <View style={styles.statusCenter}>
          <XCircle size={64} color={colors.danger} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("payment.paymentFailed")}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("payment.retryPrompt")}
          </Text>

          <View style={styles.failedButtonRow}>
            <Button
              title="Cek Ulang Status"
              onPress={() => verifyPaymentWithBackend()}
              icon={<RefreshCw size={16} color="#ffffff" />}
              loading={checkingStatus}
            />
            <Button
              title="Kembali"
              variant="outline"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#09090b",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomCheckBar: {
    padding: 12,
    borderTopWidth: 1,
  },
  statusCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  statusSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  failedButtonRow: {
    width: "100%",
    gap: 10,
    marginTop: 16,
  },
});
