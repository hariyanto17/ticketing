import React from "react";
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
import { useCreateBookingMutation } from "../lib/api/bookingApi";
import { useCreateQrisPaymentMutation } from "../lib/api/paymentApi";
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

  const [createBookingMutation, { isLoading: creatingBooking }] = useCreateBookingMutation();
  const [createQrisPaymentMutation, { isLoading: creatingQrisPayment }] = useCreateQrisPaymentMutation();

  const submitting = creatingBooking || creatingQrisPayment;

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

    try {
      // 1. Create PENDING Online Booking on authoritative backend via RTK Query mutation
      const bookingRes = await createBookingMutation({
        scheduleId: selectedSchedule.id,
        seatIds: selectedSeats.map((s) => s.seat.id),
        customerName: customerInfo.name.trim(),
        customerPhone: customerInfo.phone.trim(),
        customerEmail: customerInfo.email.trim() || undefined,
      }).unwrap();

      const orderId = bookingRes.order.id;

      // 2. Charge Direct Midtrans Core API QRIS via RTK Query mutation
      const qrisRes = await createQrisPaymentMutation(orderId).unwrap();

      // 3. Navigate to Native Custom QRIS Payment Screen
      navigation.navigate("Payment", {
        orderId,
        qrUrl: qrisRes.qrUrl,
        qrString: qrisRes.qrString,
        amount: qrisRes.amount,
        expiredAt: qrisRes.expiredAt,
      });
    } catch (err: any) {
      Alert.alert(
        t("common.error"),
        err?.data?.message || err?.message || "Gagal memproses pembayaran QRIS. Silakan periksa kembali data Anda."
      );
    }
  };

  const formatScheduleDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatScheduleTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("summary.title")} showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Reservation Hold Countdown */}
        {reservedUntil && (
          <HoldTimer reservedUntil={reservedUntil} onExpired={handleHoldExpired} />
        )}

        <View style={styles.content}>
          {/* Order Item Details Card */}
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <Film size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("summary.orderDetail")}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t("summary.movie")}</Text>
              <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
                {selectedSchedule.movie?.title}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t("summary.studio")}</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {selectedSchedule.studio?.name}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t("summary.date")}</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatScheduleDate(selectedSchedule.businessDate || selectedSchedule.startTime)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t("summary.time")}</Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatScheduleTime(selectedSchedule.startTime)} WIB
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{t("summary.seats")}</Text>
              <Text style={[styles.metaValue, { color: colors.primary }]}>
                {selectedSeats.map((s) => s.seat.seatLabel).join(", ")} ({selectedSeats.length} Kursi)
              </Text>
            </View>
          </Card>

          {/* Customer Input Card */}
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <User size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("summary.contactInfo")}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("summary.customerName")} <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <User size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("summary.namePlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  value={customerInfo.name}
                  onChangeText={(val) => setCustomerInfo((prev) => ({ ...prev, name: val }))}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("summary.customerPhone")} <Text style={{ color: colors.danger }}>*</Text>
              </Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Phone size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("summary.phonePlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  value={customerInfo.phone}
                  onChangeText={(val) => setCustomerInfo((prev) => ({ ...prev, phone: val }))}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("summary.customerEmail")}
              </Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <Mail size={16} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t("summary.emailPlaceholder")}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={customerInfo.email}
                  onChangeText={(val) => setCustomerInfo((prev) => ({ ...prev, email: val }))}
                />
              </View>
            </View>
          </Card>

          {/* Pricing Calculation Card */}
          <Card style={styles.sectionCard}>
            <View style={styles.cardHeaderRow}>
              <CreditCard size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {t("summary.priceDetail")}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>
                Tiket ({selectedSeats.length}x @ {formatCurrency(selectedSchedule.ticketPrice)})
              </Text>
              <Text style={[styles.metaValue, { color: colors.text }]}>
                {formatCurrency(estimatedTotal)}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Biaya Layanan</Text>
              <Text style={[styles.metaValue, { color: colors.success }]}>GRATIS</Text>
            </View>

            <View style={[styles.totalDivider, { backgroundColor: colors.cardBorder }]} />

            <View style={styles.priceRow}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>{t("summary.totalPay")}</Text>
              <Text style={[styles.totalPrice, { color: colors.primary }]}>
                {formatCurrency(estimatedTotal)}
              </Text>
            </View>
          </Card>

          {/* Guarantee Badge */}
          <View style={[styles.securityCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <ShieldCheck size={20} color={colors.success} />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>
              {t("summary.securePaymentNotice")}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <View style={styles.footerRow}>
          <View>
            <Text style={[styles.footerTotalLabel, { color: colors.textMuted }]}>
              {t("summary.totalPay")}
            </Text>
            <Text style={[styles.footerTotalPrice, { color: colors.primary }]}>
              {formatCurrency(estimatedTotal)}
            </Text>
          </View>

          <Button
            title={t("summary.payNow")}
            onPress={handleProceedToPayment}
            loading={submitting}
            size="large"
          />
        </View>
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
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 24,
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
    lineHeight: 20,
  },
  sectionCard: {
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 13,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    maxWidth: "60%",
    textAlign: "right",
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalDivider: {
    height: 1,
    marginVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "900",
  },
  securityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  securityText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerTotalLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  footerTotalPrice: {
    fontSize: 18,
    fontWeight: "900",
  },
});
