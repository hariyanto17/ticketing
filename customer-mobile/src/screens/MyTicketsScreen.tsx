import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import QRCode from "react-native-qrcode-svg";
import {
  Search,
  Ticket,
  Calendar,
  Clock,
  Armchair,
  ShieldCheck,
  History,
  Maximize2,
  X,
  Scan,
  Film,
  Printer,
  CheckCircle2,
  Radio,
  Smartphone,
} from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Order, Ticket as TicketType } from "../types/booking";
import { useLazyLookupBookingsQuery, useTriggerKioskPrintMutation } from "../lib/api/bookingApi";
import { initSocket, getSocket } from "../services/socketService";
import { storageService, StoredBookingRef } from "../services/storageService";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { useAppSelector } from "../lib/store";

type MyTicketsRouteProp = RouteProp<RootStackParamList, "MyTickets">;

const { width } = Dimensions.get("window");
const QR_MODAL_SIZE = Math.min(width - 80, 280);

export const MyTicketsScreen: React.FC = () => {
  const route = useRoute<MyTicketsRouteProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const persistedTickets = useAppSelector((state) => state.tickets);
  const recentBookings = persistedTickets.recentBookings;
  const lastCustomerPhone = persistedTickets.lastCustomerPhone;

  const [query, setQuery] = useState<string>(route.params?.autoQuery || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "PAID" | "CANCELLED">("ALL");

  // Selected ticket for full-screen barcode / QR modal
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<{
    ticket: TicketType;
    order: Order;
  } | null>(null);

  // Kiosk Printing Modal State
  const [kioskModalOrder, setKioskModalOrder] = useState<Order | null>(null);
  const [selectedKioskId, setSelectedKioskId] = useState<string>("KIOSK-01");
  const [customKioskId, setCustomKioskId] = useState<string>("");
  const [kioskPrintStatus, setKioskPrintStatus] = useState<"idle" | "printing" | "success" | "error">("idle");
  const [kioskErrorMessage, setKioskErrorMessage] = useState<string>("");

  const [triggerLookup, { isFetching: loading }] = useLazyLookupBookingsQuery();
  const [triggerKioskPrint, { isLoading: isTriggeringPrint }] = useTriggerKioskPrintMutation();

  const handleSendPrintToKiosk = async () => {
    if (!kioskModalOrder) return;
    const targetKiosk = (customKioskId.trim() || selectedKioskId).toUpperCase();
    if (!targetKiosk) {
      setKioskErrorMessage("Pilih atau masukkan ID Stasiun Kiosk.");
      setKioskPrintStatus("error");
      return;
    }

    try {
      setKioskPrintStatus("printing");
      setKioskErrorMessage("");

      // 1. Emit via Socket.IO for immediate local bridge
      const socket = getSocket() || initSocket();
      if (socket) {
        socket.emit("kiosk_trigger_print", {
          kioskId: targetKiosk,
          query: kioskModalOrder.orderNumber,
        });
      }

      // 2. Call backend REST endpoint
      await triggerKioskPrint({
        kioskId: targetKiosk,
        query: kioskModalOrder.orderNumber,
      }).unwrap();

      setKioskPrintStatus("success");
    } catch (err: any) {
      console.error("Kiosk print failed:", err);
      setKioskErrorMessage(
        err?.data?.message || err?.message || "Gagal mengirim perintah ke Kiosk."
      );
      setKioskPrintStatus("error");
    }
  };

  useEffect(() => {
    if (route.params?.autoQuery) {
      setQuery(route.params.autoQuery);
      handleSearch(route.params.autoQuery);
    } else if (lastCustomerPhone) {
      setQuery(lastCustomerPhone);
      handleSearch(lastCustomerPhone);
    } else if (recentBookings.length > 0 && recentBookings[0].orderNumber) {
      setQuery(recentBookings[0].orderNumber);
      handleSearch(recentBookings[0].orderNumber);
    }
  }, [route.params?.autoQuery, lastCustomerPhone, recentBookings.length]);

  const handleSearch = async (searchTerm = query) => {
    if (!searchTerm.trim()) return;
    setHasSearched(true);
    try {
      const data = await triggerLookup(searchTerm.trim(), false).unwrap();
      setOrders(data);
    } catch (e) {
      console.error("Failed to lookup tickets", e);
      setOrders([]);
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

  // Filter calculations
  const paidOrdersCount = orders.filter((o) => o.orderStatus === "PAID" || o.paymentStatus === "PAID").length;
  const cancelledOrdersCount = orders.filter((o) => o.orderStatus === "CANCELLED" || o.paymentStatus === "FAILED").length;
  const allOrdersCount = orders.length;

  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === "PAID") return order.orderStatus === "PAID" || order.paymentStatus === "PAID";
    if (selectedFilter === "CANCELLED") return order.orderStatus === "CANCELLED" || order.paymentStatus === "FAILED";
    return true;
  });

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

      {/* Status Filter Tabs (Semua / Lunas / Dibatalkan) */}
      {orders.length > 0 && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === "ALL" ? colors.primary : colors.card,
                  borderColor: selectedFilter === "ALL" ? colors.primary : colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedFilter("ALL")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: selectedFilter === "ALL" ? "#ffffff" : colors.text },
                ]}
              >
                {t("myTickets.filterAll")} ({allOrdersCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === "PAID" ? colors.success : colors.card,
                  borderColor: selectedFilter === "PAID" ? colors.success : colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedFilter("PAID")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: selectedFilter === "PAID" ? "#ffffff" : colors.text },
                ]}
              >
                {t("myTickets.filterPaid")} ({paidOrdersCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === "CANCELLED" ? colors.danger : colors.card,
                  borderColor: selectedFilter === "CANCELLED" ? colors.danger : colors.cardBorder,
                },
              ]}
              onPress={() => setSelectedFilter("CANCELLED")}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: selectedFilter === "CANCELLED" ? "#ffffff" : colors.text },
                ]}
              >
                {t("myTickets.filterCancelled")} ({cancelledOrdersCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Recent Bookings Fast Chips */}
        {recentBookings.length > 0 && !hasSearched && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <History size={16} color={colors.primary} />
              <Text style={[styles.recentTitle, { color: colors.text }]}>
                {t("myTickets.recentOrders")}
              </Text>
            </View>

            <View style={styles.recentChipsRow}>
              {recentBookings.map((b) => (
                <TouchableOpacity
                  key={b.orderId}
                  style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setQuery(b.orderNumber);
                    handleSearch(b.orderNumber);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipOrderNum, { color: colors.primary }]}>{b.orderNumber}</Text>
                  <Text style={[styles.chipMovie, { color: colors.textMuted }]} numberOfLines={1}>
                    {b.movieTitle}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Results */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : filteredOrders.length > 0 ? (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <Card key={order.id} style={styles.orderCard}>
                {/* Header info */}
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={[styles.orderNumber, { color: colors.text }]}>
                      {order.orderNumber}
                    </Text>
                    <Text style={[styles.movieTitle, { color: colors.primary }]}>
                      {order.schedule?.movie?.title || "Film Planet Cinema"}
                    </Text>
                  </View>
                  <Badge
                    label={order.orderStatus}
                    variant={order.orderStatus === "PAID" ? "success" : "danger"}
                  />
                </View>

                {/* Schedule info row */}
                <View style={[styles.infoRow, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.infoCol}>
                    <Calendar size={14} color={colors.textMuted} />
                    <Text style={[styles.infoColText, { color: colors.text }]}>
                      {order.schedule?.businessDate
                        ? new Date(order.schedule.businessDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })
                        : "-"}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Clock size={14} color={colors.textMuted} />
                    <Text style={[styles.infoColText, { color: colors.text }]}>
                      {order.schedule?.startTime
                        ? new Date(order.schedule.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </Text>
                  </View>

                  <View style={styles.infoCol}>
                    <Armchair size={14} color={colors.textMuted} />
                    <Text style={[styles.infoColText, { color: colors.text }]}>
                      {order.schedule?.studio?.name || "Studio"}
                    </Text>
                  </View>
                </View>

                {/* Action: Cetak di Mesin Kiosk */}
                {(order.orderStatus === "PAID" || order.paymentStatus === "PAID") && (
                  <TouchableOpacity
                    style={[styles.kioskPrintBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      setKioskModalOrder(order);
                      setKioskPrintStatus("idle");
                      setKioskErrorMessage("");
                      setCustomKioskId("");
                    }}
                    activeOpacity={0.8}
                  >
                    <Printer size={16} color="#ffffff" />
                    <Text style={styles.kioskPrintBtnText}>Cetak Tiket Fisik di Kiosk</Text>
                  </TouchableOpacity>
                )}

                {/* Individual Seat Tickets & QR Codes */}
                <View style={styles.ticketsContainer}>
                  <Text style={[styles.ticketsTitle, { color: colors.textMuted }]}>
                    E-Tiket ({order.tickets?.length || 0} Tiket) • Ketuk tiket untuk perbesar QR
                  </Text>

                  {order.tickets?.map((ticket) => (
                    <TouchableOpacity
                      key={ticket.id}
                      style={[styles.ticketItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                      onPress={() => setSelectedTicketForModal({ ticket, order })}
                      activeOpacity={0.7}
                    >
                      {/* Left: QR Code with expand badge */}
                      <View style={styles.qrBox}>
                        <QRCode
                          value={ticket.qrCode || ticket.ticketNumber}
                          size={70}
                          color="#000000"
                          backgroundColor="#ffffff"
                        />
                        <View style={styles.expandIconBadge}>
                          <Maximize2 size={10} color="#ffffff" />
                        </View>
                      </View>

                      {/* Right: Seat & Ticket info */}
                      <View style={styles.ticketDetails}>
                        <View style={styles.ticketTopRow}>
                          <Text style={[styles.seatLabel, { color: colors.primary }]}>
                            Kursi: {ticket.showtimeSeat?.seat?.seatLabel || "-"}
                          </Text>
                          {getTicketStatusBadge(ticket.status)}
                        </View>
                        <Text style={[styles.ticketCode, { color: colors.textMuted }]}>
                          No: {ticket.ticketNumber}
                        </Text>
                        <View style={styles.tapToExpandRow}>
                          <Scan size={12} color={colors.primary} />
                          <Text style={[styles.scanHint, { color: colors.primary }]}>
                            {t("myTickets.tapToExpand")}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        ) : orders.length > 0 && filteredOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Ticket size={48} color={colors.textMuted} />
            <Text style={[styles.centerTitle, { color: colors.text }]}>
              {t("myTickets.noFilteredTickets")}
            </Text>
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {t("myTickets.searchHint")}
            </Text>
          </View>
        ) : hasSearched ? (
          <View style={styles.centerBox}>
            <Ticket size={48} color={colors.textMuted} />
            <Text style={[styles.centerTitle, { color: colors.text }]}>
              {t("myTickets.noTicketsFound")}
            </Text>
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {t("myTickets.searchHint")}
            </Text>
          </View>
        ) : (
          <View style={styles.centerBox}>
            <Search size={48} color={colors.textMuted} />
            <Text style={[styles.centerTitle, { color: colors.text }]}>
              {t("myTickets.searchPlaceholder")}
            </Text>
            <Text style={[styles.centerText, { color: colors.textMuted }]}>
              {t("myTickets.searchHint")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FULL-SCREEN BARCODE / QR MODAL */}
      <Modal
        visible={!!selectedTicketForModal}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setSelectedTicketForModal(null)}
      >
        {selectedTicketForModal && (
          <View style={styles.modalOverlay}>
            <SafeAreaView style={[styles.modalContent, { backgroundColor: colors.background }]}>
              {/* Modal Top Bar */}
              <View style={[styles.modalTopBar, { borderBottomColor: colors.cardBorder }]}>
                <View style={styles.modalHeaderTitleRow}>
                  <Film size={18} color={colors.primary} />
                  <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                    E-Tiket Masuk Bioskop
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                  onPress={() => setSelectedTicketForModal(null)}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {/* Movie & Studio Information */}
                <View style={styles.modalMovieHeader}>
                  <Text style={[styles.modalMovieTitle, { color: colors.primary }]}>
                    {selectedTicketForModal.order.schedule?.movie?.title || "Film Planet Cinema"}
                  </Text>
                  <Text style={[styles.modalStudioText, { color: colors.textMuted }]}>
                    {selectedTicketForModal.order.schedule?.studio?.name || "Studio"} •{" "}
                    {selectedTicketForModal.order.schedule?.businessDate
                      ? new Date(selectedTicketForModal.order.schedule.businessDate).toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })
                      : ""}{" "}
                    {selectedTicketForModal.order.schedule?.startTime
                      ? new Date(selectedTicketForModal.order.schedule.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : ""}
                  </Text>
                </View>

                {/* Big Seat Number Display */}
                <View style={[styles.modalSeatBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  <Armchair size={22} color={colors.primary} />
                  <Text style={[styles.modalSeatLabel, { color: colors.text }]}>
                    KURSI{" "}
                    <Text style={[styles.modalSeatNumber, { color: colors.primary }]}>
                      {selectedTicketForModal.ticket.showtimeSeat?.seat?.seatLabel || "-"}
                    </Text>
                  </Text>
                </View>

                {/* Full-Screen Crisp QR Code */}
                <View style={styles.modalQrWrapper}>
                  <View style={styles.modalQrWhiteCard}>
                    <QRCode
                      value={
                        selectedTicketForModal.ticket.qrCode ||
                        selectedTicketForModal.ticket.ticketNumber
                      }
                      size={QR_MODAL_SIZE}
                      color="#000000"
                      backgroundColor="#ffffff"
                    />
                  </View>
                </View>

                {/* Ticket Number & Status */}
                <View style={styles.modalTicketMeta}>
                  <Text style={[styles.modalTicketNo, { color: colors.text }]}>
                    {selectedTicketForModal.ticket.ticketNumber}
                  </Text>
                  {getTicketStatusBadge(selectedTicketForModal.ticket.status)}
                </View>

                {/* Turnstile Gate Instruction Banner */}
                <View style={[styles.modalInstructionCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Scan size={20} color={colors.primary} />
                  <Text style={[styles.modalInstructionText, { color: colors.textMuted }]}>
                    {t("myTickets.gateInstruction")}
                  </Text>
                </View>

                {/* Close Button */}
                <View style={styles.modalButtonContainer}>
                  <Button
                    title={t("myTickets.closeTicket")}
                    variant="outline"
                    onPress={() => setSelectedTicketForModal(null)}
                    size="large"
                  />
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </Modal>

      {/* KIOSK PRINTING MODAL */}
      <Modal
        visible={!!kioskModalOrder}
        animationType="slide"
        transparent={true}
        statusBarTranslucent
        onRequestClose={() => setKioskModalOrder(null)}
      >
        {kioskModalOrder && (
          <View style={styles.modalOverlay}>
            <SafeAreaView style={[styles.kioskModalCard, { backgroundColor: colors.background }]}>
              {/* Top Header */}
              <View style={[styles.modalTopBar, { borderBottomColor: colors.cardBorder }]}>
                <View style={styles.modalHeaderTitleRow}>
                  <Printer size={18} color={colors.primary} />
                  <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>
                    Cetak di Mesin Kiosk
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                  onPress={() => setKioskModalOrder(null)}
                  activeOpacity={0.7}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.kioskModalBody} showsVerticalScrollIndicator={false}>
                {kioskPrintStatus === "success" ? (
                  <View style={styles.kioskSuccessBox}>
                    <View style={[styles.kioskSuccessIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                      <CheckCircle2 size={48} color={colors.success} />
                    </View>
                    <Text style={[styles.kioskSuccessTitle, { color: colors.text }]}>
                      Perintah Cetak Terkirim!
                    </Text>
                    <Text style={[styles.kioskSuccessSubtitle, { color: colors.textMuted }]}>
                      Mesin Kiosk <Text style={{ color: colors.primary, fontWeight: "800" }}>{(customKioskId.trim() || selectedKioskId).toUpperCase()}</Text> sedang mencetak tiket fisik Anda. Silakan ambil tiket pada slot printer di bawah layar kiosk.
                    </Text>
                    <Button
                      title="Selesai"
                      onPress={() => setKioskModalOrder(null)}
                      size="large"
                      style={{ width: "100%", marginTop: 16 }}
                    />
                  </View>
                ) : (
                  <>
                    {/* Order summary */}
                    <View style={[styles.kioskOrderSummary, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <Text style={[styles.kioskMovieTitle, { color: colors.primary }]}>
                        {kioskModalOrder.schedule?.movie?.title || "Planet Cinema"}
                      </Text>
                      <Text style={[styles.kioskOrderMeta, { color: colors.textMuted }]}>
                        {kioskModalOrder.schedule?.studio?.name} • {kioskModalOrder.tickets?.length} Tiket ({kioskModalOrder.tickets?.map((t) => t.showtimeSeat?.seat?.seatLabel).join(", ")})
                      </Text>
                    </View>

                    {/* Step instruction */}
                    <View style={[styles.kioskInstructionBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <Smartphone size={20} color={colors.primary} />
                      <Text style={[styles.kioskInstructionText, { color: colors.text }]}>
                        Lihat kode stasiun pada layar mesin kiosk di depan Anda (contoh: <Text style={{ color: colors.primary, fontWeight: "bold" }}>KIOSK-01</Text>).
                      </Text>
                    </View>

                    {/* Station Presets */}
                    <Text style={[styles.kioskStationLabel, { color: colors.textMuted }]}>
                      PILIH STASIUN KIOSK:
                    </Text>
                    <View style={styles.kioskPresetRow}>
                      {["KIOSK-01", "KIOSK-02", "KIOSK-03"].map((id) => (
                        <TouchableOpacity
                          key={id}
                          style={[
                            styles.kioskPresetBtn,
                            {
                              backgroundColor: (selectedKioskId === id && !customKioskId) ? colors.primary : colors.card,
                              borderColor: (selectedKioskId === id && !customKioskId) ? colors.primary : colors.cardBorder,
                            },
                          ]}
                          onPress={() => {
                            setSelectedKioskId(id);
                            setCustomKioskId("");
                          }}
                          activeOpacity={0.8}
                        >
                          <Radio size={14} color={(selectedKioskId === id && !customKioskId) ? "#ffffff" : colors.textMuted} />
                          <Text
                            style={[
                              styles.kioskPresetText,
                              { color: (selectedKioskId === id && !customKioskId) ? "#ffffff" : colors.text },
                            ]}
                          >
                            {id}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Custom Input */}
                    <View style={[styles.customKioskInputRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                      <TextInput
                        style={[styles.customKioskInput, { color: colors.text }]}
                        placeholder="Atau ketik kode kiosk lainnya..."
                        placeholderTextColor={colors.textMuted}
                        value={customKioskId}
                        onChangeText={setCustomKioskId}
                        autoCapitalize="characters"
                      />
                    </View>

                    {/* Error Banner */}
                    {kioskPrintStatus === "error" && kioskErrorMessage ? (
                      <View style={styles.kioskErrorBanner}>
                        <Text style={styles.kioskErrorText}>{kioskErrorMessage}</Text>
                      </View>
                    ) : null}

                    {/* Submit Button */}
                    <Button
                      title={kioskPrintStatus === "printing" ? "Mengirim ke Kiosk..." : "Cetak Tiket Sekarang"}
                      onPress={handleSendPrintToKiosk}
                      loading={kioskPrintStatus === "printing" || isTriggeringPrint}
                      size="large"
                      icon={<Printer size={18} color="#ffffff" />}
                      style={{ width: "100%", marginTop: 8 }}
                    />
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          </View>
        )}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingLeft: 12,
    paddingRight: 6,
    height: 48,
    gap: 8,
  },
  filterSection: {
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  recentSection: {
    gap: 10,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  recentChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "48%",
  },
  chipOrderNum: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipMovie: {
    fontSize: 11,
  },
  ordersList: {
    gap: 16,
  },
  orderCard: {
    padding: 16,
    gap: 14,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "800",
  },
  movieTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoColText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ticketsContainer: {
    gap: 10,
  },
  ticketsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ticketItem: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  qrBox: {
    padding: 6,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    position: "relative",
  },
  expandIconBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 4,
    padding: 2,
  },
  ticketDetails: {
    flex: 1,
    gap: 4,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seatLabel: {
    fontSize: 15,
    fontWeight: "800",
  },
  ticketCode: {
    fontSize: 11,
    fontWeight: "600",
  },
  tapToExpandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  scanHint: {
    fontSize: 11,
    fontWeight: "600",
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  centerText: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  modalContent: {
    flex: 1,
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollBody: {
    padding: 24,
    alignItems: "center",
    gap: 18,
    paddingBottom: 40,
  },
  modalMovieHeader: {
    alignItems: "center",
    gap: 4,
  },
  modalMovieTitle: {
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  modalStudioText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  modalSeatBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  modalSeatLabel: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 1,
  },
  modalSeatNumber: {
    fontSize: 20,
    fontWeight: "900",
  },
  modalQrWrapper: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalQrWhiteCard: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTicketMeta: {
    alignItems: "center",
    gap: 8,
  },
  modalTicketNo: {
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "monospace",
    letterSpacing: 1,
  },
  modalInstructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    width: "100%",
  },
  modalInstructionText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  modalButtonContainer: {
    width: "100%",
    marginTop: 6,
  },
  kioskPrintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  kioskPrintBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  kioskModalCard: {
    flex: 1,
  },
  kioskModalBody: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  kioskSuccessBox: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 12,
  },
  kioskSuccessIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kioskSuccessTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  kioskSuccessSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 290,
  },
  kioskOrderSummary: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  kioskMovieTitle: {
    fontSize: 16,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  kioskOrderMeta: {
    fontSize: 12,
    fontWeight: "600",
  },
  kioskInstructionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  kioskInstructionText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  kioskStationLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  kioskPresetRow: {
    flexDirection: "row",
    gap: 10,
  },
  kioskPresetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  kioskPresetText: {
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  customKioskInputRow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  customKioskInput: {
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "600",
  },
  kioskErrorBanner: {
    padding: 12,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderRadius: 12,
  },
  kioskErrorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
