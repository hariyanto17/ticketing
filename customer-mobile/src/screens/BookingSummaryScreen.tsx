import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Film, User, Phone, Mail, CreditCard, ShieldCheck } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { bookingService } from "../services/bookingService";
import { paymentService } from "../services/paymentService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { HoldTimer } from "../components/seat/HoldTimer";

type BookingSummaryNavProp = StackNavigationProp<RootStackParamList>;

export const BookingSummaryScreen: React.FC = () => {
  const navigation = useNavigation<BookingSummaryNavProp>();
  const {
    selectedSchedule,
    selectedSeats,
    customerInfo,
    setCustomerInfo,
    reservedUntil,
    clearSelectedSeats,
    estimatedTotal,
  } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();

  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!selectedSchedule || selectedSeats.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title={t("summary.title")} showBack onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Tidak ada reservasi aktif. Silakan pilih jadwal dan kursi terlebih dahulu.
          </Text>
          <Button title={t("common.back")} onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  const handleHoldExpired = () => {
    Alert.alert(t("seat.timerExpired"), t("seat.timerExpired"), [
      {
        text: "OK",
        onPress: () => {
          clearSelectedSeats();
          navigation.goBack();
        },
      },
    ]);
  };

  const handleProceedToPayment = async () => {
    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      Alert.alert(t("common.error"), t("summary.fillRequired"));
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create PENDING Online Booking on authoritative backend
      const bookingRes = await bookingService.createBooking({
        scheduleId: selectedSchedule.id,
        seatIds: selectedSeats.map((s) => s.seat.id),
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: customerInfo.email.trim() || undefined,
      });

      const orderId = bookingRes.order.id;

      // 2. Request Midtrans Snap Transaction Token
      const snapRes = await paymentService.createSnapToken(orderId);

      // 3. Navigate to Midtrans Payment Screen
      navigation.navigate("Payment", {
        orderId,
        snapUrl: snapRes.redirect_url,
      });
    } catch (err: any) {
      Alert.alert(
        t("common.error"),
        err.message || "Gagal memproses pemesanan online. Silakan periksa kembali data Anda."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const startTimeStr = new Date(selectedSchedule.startTime).toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("summary.title")} showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hold Countdown Timer */}
        {reservedUntil && (
          <View style={styles.timerPadding}>
            <HoldTimer reservedUntil={reservedUntil} onExpired={handleHoldExpired} />
          </View>
        )}

        {/* Movie and Schedule Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("summary.movieInfo")}
          </Text>
          <Card>
            <View style={styles.movieHeaderRow}>
              <Film size={20} color={colors.primary} />
              <Text style={[styles.movieTitle, { color: colors.text }]}>
                {selectedSchedule.movie?.title}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {selectedSchedule.studio?.name || "Studio 1"}
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {startTimeStr}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textMuted }]}>
                {t("seat.selectedSeats")}
              </Text>
              <Text style={[styles.seatsValue, { color: colors.primary }]}>
                {selectedSeats.map((s) => s.seat.seatLabel).join(", ")}
              </Text>
            </View>
          </Card>
        </View>

        {/* Customer Information Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("summary.customerInfo")}
          </Text>
          <Card style={styles.formCard}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <User size={14} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("summary.fullName")} *
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder={t("summary.fullNamePlaceholder")}
                placeholderTextColor={colors.textMuted}
                value={customerInfo.name}
                onChangeText={(name) => setCustomerInfo((prev) => ({ ...prev, name }))}
              />
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Phone size={14} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("summary.phoneNumber")} *
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder={t("summary.phonePlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={customerInfo.phone}
                onChangeText={(phone) => setCustomerInfo((prev) => ({ ...prev, phone }))}
              />
              <Text style={[styles.helperText, { color: colors.textMuted }]}>
                {t("summary.phoneHelper")}
              </Text>
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Mail size={14} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  {t("summary.email")}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder, color: colors.text },
                ]}
                placeholder={t("summary.emailPlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={customerInfo.email}
                onChangeText={(email) => setCustomerInfo((prev) => ({ ...prev, email }))}
              />
            </View>
          </Card>
        </View>

        {/* Price Breakdown */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("summary.priceDetails")}
          </Text>
          <Card>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
                {t("summary.ticketPrice")}
              </Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                {formatCurrency(selectedSchedule.ticketPrice)}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.textMuted }]}>
                {t("summary.quantity")}
              </Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                {selectedSeats.length} tiket
              </Text>
            </View>

            <View style={[styles.priceDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.priceRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>
                {t("summary.totalPayment")}
              </Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>
                {formatCurrency(estimatedTotal)}
              </Text>
            </View>
          </Card>
        </View>

        {/* Midtrans Trust Badge */}
        <View style={styles.trustBadgeRow}>
          <ShieldCheck size={16} color={colors.success} />
          <Text style={[styles.trustText, { color: colors.textMuted }]}>
            Pembayaran diamankan secara resmi melalui Midtrans Payment Gateway.
          </Text>
        </View>
      </ScrollView>

      {/* Pay CTA */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <Button
          title={t("summary.payWithMidtrans")}
          onPress={handleProceedToPayment}
          loading={submitting}
          icon={<CreditCard size={18} color="#ffffff" />}
          size="large"
        />
      </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  timerPadding: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  movieHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  seatsValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  formCard: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  helperText: {
    fontSize: 11,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 13,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "600",
  },
  priceDivider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "800",
  },
  trustBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  trustText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
