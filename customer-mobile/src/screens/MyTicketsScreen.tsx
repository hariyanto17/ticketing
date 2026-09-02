import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import { Search, Ticket, Calendar, Clock, Armchair, ShieldCheck, History } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Order, Ticket as TicketType } from "../types/booking";
import { bookingService } from "../services/bookingService";
import { storageService, StoredBookingRef } from "../services/storageService";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

type MyTicketsRouteProp = RouteProp<RootStackParamList, "MyTickets">;

export const MyTicketsScreen: React.FC = () => {
  const route = useRoute<MyTicketsRouteProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [query, setQuery] = useState<string>(route.params?.autoQuery || "");
  const [loading, setLoading] = useState<boolean>(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentBookings, setRecentBookings] = useState<StoredBookingRef[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    storageService.getRecentBookings().then(setRecentBookings);
    if (route.params?.autoQuery) {
      handleSearch(route.params.autoQuery);
    }
  }, [route.params?.autoQuery]);

  const handleSearch = async (searchTerm = query) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await bookingService.lookupBookings(searchTerm.trim());
      setOrders(data);
    } catch (e) {
      console.error("Failed to lookup tickets", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getTicketStatusBadge = (status: TicketType["status"]) => {
    switch (status) {
      case "ACTIVE":
        return <Badge label={t("myTickets.statusActive")} variant="success" />;
      case "PENDING":
        return <Badge label={t("myTickets.statusPending")} variant="warning" />;
      case "USED":
        return <Badge label={t("myTickets.statusUsed")} variant="muted" />;
      case "CANCELLED":
      default:
        return <Badge label={t("myTickets.statusCancelled")} variant="danger" />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("myTickets.title")} />

      {/* Search Input Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t("myTickets.searchPlaceholder")}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearch()}
          />
          <Button
            title={t("myTickets.searchButton")}
            size="small"
            onPress={() => handleSearch()}
            loading={loading}
          />
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Recent Bookings Fast Chips */}
        {recentBookings.length > 0 && !hasSearched && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <History size={16} color={colors.primary} />
              <Text style={[styles.recentTitle, { color: colors.text }]}>
                {t("myTickets.recentBookings")}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentScroll}>
              {recentBookings.map((b) => (
                <TouchableOpacity
                  key={b.orderId}
                  style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    const code = b.bookingNumber || b.orderNumber;
                    setQuery(code);
                    handleSearch(code);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.recentMovie, { color: colors.text }]} numberOfLines={1}>
                    {b.movieTitle}
                  </Text>
                  <Text style={[styles.recentCode, { color: colors.primary }]}>
                    {b.bookingNumber || b.orderNumber}
                  </Text>
                  <Text style={[styles.recentSeats, { color: colors.textMuted }]}>
                    {b.seatLabels.join(", ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : orders.length > 0 ? (
          <View style={styles.ticketList}>
            {orders.map((order) => {
              const schedule = order.schedule;
              const tickets = order.tickets || [];
              const startTime = schedule?.startTime
                ? new Date(schedule.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "—";
              const dateFormatted = schedule?.startTime
                ? new Date(schedule.startTime).toLocaleDateString("id-ID", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })
                : "—";

              return (
                <View key={order.id} style={styles.orderContainer}>
                  {/* Order Header Summary */}
                  <View style={styles.orderMetaRow}>
                    <Text style={[styles.bookingCodeText, { color: colors.primary }]}>
                      {order.bookingNumber || order.orderNumber}
                    </Text>
                    <Text style={[styles.customerPhoneText, { color: colors.textMuted }]}>
                      {order.customerName || "Tamu"} • {order.customerPhone}
                    </Text>
                  </View>

                  {/* Individual Physical Tickets with Turnstile QR Codes */}
                  {tickets.map((tkt) => (
                    <Card key={tkt.id} style={styles.ticketCard}>
                      {/* Ticket Header & Status */}
                      <View style={styles.ticketCardHeader}>
                        <Text style={[styles.cinemaBrand, { color: colors.primary }]}>
                          PLANET CINEMA
                        </Text>
                        {getTicketStatusBadge(tkt.status)}
                      </View>

                      {/* Movie Title */}
                      <Text style={[styles.movieTitle, { color: colors.text }]}>
                        {schedule?.movie?.title || "Film Bioskop"}
                      </Text>

                      {/* Studio, Date, Showtime & Seat Coordinates */}
                      <View style={[styles.detailsGrid, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: colors.textMuted }]}>
                            {t("myTickets.studio")}
                          </Text>
                          <Text style={[styles.gridValue, { color: colors.text }]}>
                            {schedule?.studio?.name || "Studio 1"}
                          </Text>
                        </View>

                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: colors.textMuted }]}>
                            {t("myTickets.seat")}
                          </Text>
                          <Text style={[styles.gridValueHighlight, { color: colors.primary }]}>
                            {tkt.showtimeSeat?.seat.seatLabel || "—"}
                          </Text>
                        </View>

                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: colors.textMuted }]}>
                            {t("myTickets.date")}
                          </Text>
                          <Text style={[styles.gridValue, { color: colors.text }]}>
                            {dateFormatted}
                          </Text>
                        </View>

                        <View style={styles.gridItem}>
                          <Text style={[styles.gridLabel, { color: colors.textMuted }]}>
                            {t("myTickets.time")}
                          </Text>
                          <Text style={[styles.gridValue, { color: colors.text }]}>
                            {startTime}
                          </Text>
                        </View>
                      </View>

                      {/* Turnstile QR Code */}
                      <View style={styles.qrSection}>
                        <View style={styles.qrWrapper}>
                          <QRCode
                            value={tkt.qrCode || tkt.ticketNumber}
                            size={140}
                            backgroundColor="#ffffff"
                            color="#000000"
                          />
                        </View>

                        <Text style={[styles.ticketCodeText, { color: colors.text }]}>
                          {tkt.ticketNumber}
                        </Text>

                        <Text style={[styles.scanHint, { color: colors.textMuted }]}>
                          {t("myTickets.scanAtGate")}
                        </Text>
                      </View>
                    </Card>
                  ))}
                </View>
              );
            })}
          </View>
        ) : hasSearched ? (
          <View style={styles.emptyContainer}>
            <Ticket size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("myTickets.noTickets")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {t("myTickets.noTicketsSub")}
            </Text>
          </View>
        ) : null}
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
  scrollContent: {
    paddingBottom: 32,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    height: "100%",
  },
  recentSection: {
    paddingTop: 16,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  recentScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  recentChip: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minWidth: 140,
  },
  recentMovie: {
    fontSize: 13,
    fontWeight: "700",
  },
  recentCode: {
    fontSize: 12,
    fontWeight: "800",
  },
  recentSeats: {
    fontSize: 11,
  },
  loadingContainer: {
    paddingTop: 48,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  ticketList: {
    padding: 16,
    gap: 20,
  },
  orderContainer: {
    gap: 12,
  },
  orderMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  bookingCodeText: {
    fontSize: 14,
    fontWeight: "800",
  },
  customerPhoneText: {
    fontSize: 12,
  },
  ticketCard: {
    padding: 16,
    gap: 12,
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cinemaBrand: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  movieTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  gridItem: {
    width: "50%",
    paddingVertical: 6,
    gap: 2,
  },
  gridLabel: {
    fontSize: 11,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  gridValueHighlight: {
    fontSize: 16,
    fontWeight: "900",
  },
  qrSection: {
    alignItems: "center",
    paddingTop: 8,
    gap: 8,
  },
  qrWrapper: {
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 12,
  },
  ticketCodeText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1,
  },
  scanHint: {
    fontSize: 11,
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 13,
    maxWidth: 240,
    textAlign: "center",
  },
});
