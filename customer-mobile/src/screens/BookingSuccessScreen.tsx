import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { CheckCircle2, Ticket, Home, QrCode } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Order } from "../types/booking";
import { bookingService } from "../services/bookingService";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";

type BookingSuccessRouteProp = RouteProp<RootStackParamList, "BookingSuccess">;
type BookingSuccessNavProp = StackNavigationProp<RootStackParamList>;

export const BookingSuccessScreen: React.FC = () => {
  const navigation = useNavigation<BookingSuccessNavProp>();
  const route = useRoute<BookingSuccessRouteProp>();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();

  const { orderId, bookingNumber } = route.params;

  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    bookingService
      .lookupBookings(bookingNumber)
      .then((orders) => {
        if (orders.length > 0) {
          setOrder(orders[0]);
        }
      })
      .catch((e) => console.error("Failed to load booking details", e))
      .finally(() => setLoading(false));
  }, [bookingNumber]);

  const schedule = order?.schedule;
  const tickets = order?.tickets || [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("success.title")} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.successHeader}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
            <CheckCircle2 size={56} color={colors.success} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("success.title")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {t("success.subtitle")}
          </Text>
        </View>

        {/* Order Details Card */}
        <Card style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t("success.bookingNumber")}
            </Text>
            <Text style={[styles.boldValue, { color: colors.primary }]}>
              {order?.bookingNumber || bookingNumber}
            </Text>
          </View>

          {schedule?.movie && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Film</Text>
              <Text style={[styles.boldValue, { color: colors.text }]} numberOfLines={1}>
                {schedule.movie.title}
              </Text>
            </View>
          )}

          {schedule?.studio && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Studio</Text>
              <Text style={[styles.boldValue, { color: colors.text }]}>
                {schedule.studio.name}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Kursi</Text>
            <Text style={[styles.boldValue, { color: colors.text }]}>
              {tickets.map((t) => t.showtimeSeat?.seat.seatLabel).join(", ") || "—"}
            </Text>
          </View>

          {order && (
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Total</Text>
              <Text style={[styles.boldValue, { color: colors.success }]}>
                {formatCurrency(order.totalAmount)}
              </Text>
            </View>
          )}
        </Card>

        {/* Scan Notice */}
        <View style={[styles.noticeCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <QrCode size={20} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>
            {t("success.scanNotice")}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionColumn}>
          <Button
            title={t("success.viewTickets")}
            onPress={() => navigation.navigate("MyTickets", { autoQuery: bookingNumber })}
            icon={<Ticket size={18} color="#ffffff" />}
            size="large"
          />
          <Button
            title={t("success.backHome")}
            variant="outline"
            onPress={() => navigation.replace("MainTabs")}
            icon={<Home size={18} color={colors.text} />}
            size="medium"
          />
        </View>
      </ScrollView>
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
    padding: 20,
    gap: 20,
    alignItems: "center",
  },
  successHeader: {
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
  summaryCard: {
    width: "100%",
    gap: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
  },
  boldValue: {
    fontSize: 14,
    fontWeight: "800",
    maxWidth: "60%",
    textAlign: "right",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  noticeText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  actionColumn: {
    width: "100%",
    gap: 12,
    marginTop: 8,
  },
});
