import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import QRCode from "react-native-qrcode-svg";
import {
  QrCode,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Smartphone,
  ChevronLeft,
} from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { useLazyGetPaymentStatusQuery } from "../lib/api/paymentApi";
import { storageService } from "../services/storageService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { useAppDispatch, addRecentBooking } from "../lib/store";

type PaymentScreenRouteProp = RouteProp<RootStackParamList, "Payment">;
type PaymentScreenNavProp = StackNavigationProp<RootStackParamList>;

export const PaymentScreen: React.FC = () => {
  const navigation = useNavigation<PaymentScreenNavProp>();
  const route = useRoute<PaymentScreenRouteProp>();
  const dispatch = useAppDispatch();
  const { resetBooking, selectedSchedule, selectedSeats, customerInfo, estimatedTotal } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();

  const { orderId, qrUrl, qrString, amount, expiredAt: rawExpiredAt } = route.params;

  const [triggerGetPaymentStatus, { isFetching: checkingStatus }] = useLazyGetPaymentStatusQuery();

  const [paymentState, setPaymentState] = useState<"QRIS" | "VERIFYING" | "SUCCESS" | "FAILED" | "EXPIRED">("QRIS");
  const [bookingNumber, setBookingNumber] = useState<string>("");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  // Active QR data state (may be populated from route params or refreshed from backend)
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
    return new Date(Date.now() + 2 * 60 * 1000);
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

        // Persist in Redux store (persisted to storage via redux-persist)
        dispatch(addRecentBooking(bookingRef));
        await storageService.saveBookingRef(bookingRef);

        // Reset wizard state
        resetBooking();

        // Navigate to BookingSuccessScreen after brief confirmation
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
        Alert.alert(
          "Status Pembayaran",
          "Pembayaran Anda sedang diverifikasi. Jika sudah melakukan transfer/scan, mohon tunggu beberapa detik."
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
    Alert.alert(
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
      ]
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
          {/* Amount & Expiry Header Card */}
          <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
              {t("summary.totalPay")}
            </Text>
            <Text style={[styles.amountValue, { color: colors.primary }]}>
              {formatCurrency(totalPayAmount)}
            </Text>

            {/* Countdown Badge */}
            <View style={[styles.timerBadge, { backgroundColor: isExpired ? "rgba(239,68,68,0.15)" : "rgba(225,29,72,0.1)" }]}>
              <Clock size={16} color={isExpired ? colors.danger : colors.primary} />
              <Text style={[styles.timerText, { color: isExpired ? colors.danger : colors.primary }]}>
                {isExpired ? t("payment.timeOutBadge") : `${t("payment.validTimeBadge")} ${formatCountdown(remainingSeconds)}`}
              </Text>
            </View>
          </View>

          {/* Native QR Code Display Card */}
          <Card style={styles.qrCard}>
            <View style={styles.qrHeaderRow}>
              <QrCode size={20} color={colors.primary} />
              <Text style={[styles.qrTitle, { color: colors.text }]}>
                {t("payment.scanQris")}
              </Text>
            </View>

            {/* QR Code Container */}
            <View style={styles.qrWrapper}>
              {activeQrString ? (
                <View style={styles.qrWhiteBox}>
                  <QRCode
                    value={activeQrString}
                    size={210}
                    color="#000000"
                    backgroundColor="#ffffff"
                  />
                </View>
              ) : activeQrUrl ? (
                <View style={styles.qrWhiteBox}>
                  <Image
                    source={{ uri: activeQrUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={styles.qrWhiteBoxPlaceholder}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={[styles.qrLoadingText, { color: colors.textMuted }]}>
                    {t("payment.loadingQr")}
                  </Text>
                </View>
              )}
            </View>

            {/* Supported Payment Channels */}
            <View style={styles.supportChannels}>
              <Smartphone size={16} color={colors.textMuted} />
              <Text style={[styles.supportText, { color: colors.textMuted }]}>
                {t("payment.supportChannels")}
              </Text>
            </View>

            {/* Status Pulse Banner */}
            <View style={[styles.statusBanner, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusBannerText, { color: colors.text }]}>
                {t("payment.waitingPayment")}
              </Text>
            </View>
          </Card>

          {/* Guarantee Security Notice */}
          <View style={[styles.securityNotice, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <ShieldCheck size={18} color={colors.success} />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>
              {t("payment.securityNotice")}
            </Text>
          </View>

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
      ) : paymentState === "SUCCESS" ? (
        <View style={styles.statusCenter}>
          <CheckCircle2 size={72} color={colors.success} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("success.title")}
          </Text>
          <Text style={[styles.statusAmount, { color: colors.primary }]}>
            {formatCurrency(totalPayAmount)}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("success.orderNumber")}: {bookingNumber}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("success.subtitle")}
          </Text>
        </View>
      ) : paymentState === "EXPIRED" ? (
        <View style={styles.statusCenter}>
          <Clock size={72} color={colors.danger} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("payment.timeExpired")}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("payment.timeExpiredSub")}
          </Text>
          <View style={styles.buttonCol}>
            <Button
              title={t("payment.reselectSchedule")}
              onPress={() => {
                resetBooking();
                navigation.reset({
                  index: 0,
                  routes: [{ name: "MainTabs" }],
                });
              }}
            />
          </View>
        </View>
      ) : (
        <View style={styles.statusCenter}>
          <XCircle size={72} color={colors.danger} />
          <Text style={[styles.statusTitle, { color: colors.text }]}>
            {t("payment.paymentFailed")}
          </Text>
          <Text style={[styles.statusSub, { color: colors.textMuted }]}>
            {t("payment.paymentCancelled")}
          </Text>
          <View style={styles.buttonCol}>
            <Button
              title={t("payment.retryCheck")}
              onPress={() => checkPaymentStatus(true)}
              icon={<RefreshCw size={16} color="#ffffff" />}
              loading={checkingStatus}
            />
            <Button
              title={t("common.back")}
              variant="outline"
              onPress={() => navigation.popToTop()}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  amountCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  amountValue: {
    fontSize: 26,
    fontWeight: "900",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  qrCard: {
    padding: 18,
    alignItems: "center",
    gap: 14,
  },
  qrHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  qrWrapper: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  qrWhiteBox: {
    padding: 14,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 210,
    height: 210,
  },
  qrWhiteBoxPlaceholder: {
    width: 210,
    height: 210,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  qrLoadingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  supportChannels: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  supportText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    flex: 1,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
    justifyContent: "center",
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  actionButtons: {
    gap: 10,
    marginTop: 6,
  },
  statusCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  statusAmount: {
    fontSize: 28,
    fontWeight: "900",
  },
  statusSub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  buttonCol: {
    width: "100%",
    gap: 10,
    marginTop: 16,
  },
});
