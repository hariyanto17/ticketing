import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Platform,
  PermissionsAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Camera, CameraType } from "react-native-camera-kit";
import {
  Search,
  Ticket,
  Calendar,
  Clock,
  Armchair,
  History,
  X,
  Scan,
  Film,
  Printer,
  CheckCircle2,
  Zap,
  ZapOff,
  AlertCircle,
  Camera as CameraIcon,
  RefreshCw,
  ChevronRight,
} from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Order, Ticket as TicketType } from "../types/booking";
import { useLazyLookupBookingsQuery, useTriggerKioskPrintMutation } from "../lib/api/bookingApi";
import { initSocket, getSocket } from "../services/socketService";
import { parseKioskIdFromScannedCode } from "../utils/kiosk";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { useAppSelector } from "../lib/store";

type MyTicketsRouteProp = RouteProp<RootStackParamList, "MyTickets">;

const { width } = Dimensions.get("window");

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

  // Camera Scanner Modal State for Kiosk Printing
  const [scannerOrder, setScannerOrder] = useState<Order | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<"scanning" | "printing" | "success" | "error">("scanning");
  const [detectedKioskId, setDetectedKioskId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualKioskId, setManualKioskId] = useState<string>("");

  const isScanningLocked = useRef<boolean>(false);

  const [triggerLookup, { isFetching: loading }] = useLazyLookupBookingsQuery();
  const [triggerKioskPrint, { isLoading: isTriggeringPrint }] = useTriggerKioskPrintMutation();

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

  const requestCameraPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Izin Akses Kamera",
            message: "Aplikasi Planet Cinema membutuhkan izin kamera untuk memindai barcode / QR mesin Kiosk.",
            buttonPositive: "Izinkan",
            buttonNegative: "Batal",
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        setHasCameraPermission(isGranted);
        return isGranted;
      } catch (err) {
        console.warn("Camera permission request failed:", err);
        setHasCameraPermission(false);
        return false;
      }
    }
    setHasCameraPermission(true);
    return true;
  };

  const handleOpenScanner = async (order: Order) => {
    setScannerOrder(order);
    setScanStatus("scanning");
    setErrorMessage("");
    setDetectedKioskId("");
    setIsTorchOn(false);
    setShowManualInput(false);
    setManualKioskId("");
    isScanningLocked.current = false;

    const permitted = await requestCameraPermission();
    if (!permitted) {
      setErrorMessage("Izin kamera diperlukan untuk memindai barcode mesin kiosk.");
    }
  };

  const handleCloseScanner = () => {
    setScannerOrder(null);
    setScanStatus("scanning");
    setErrorMessage("");
    setDetectedKioskId("");
    setIsTorchOn(false);
    isScanningLocked.current = false;
  };

  const executeKioskPrint = async (kioskId: string) => {
    if (!scannerOrder) return;
    const sanitizedKioskId = kioskId.trim().toUpperCase();
    if (!sanitizedKioskId) {
      setErrorMessage("ID Stasiun Kiosk tidak valid.");
      setScanStatus("error");
      return;
    }

    try {
      setScanStatus("printing");
      setDetectedKioskId(sanitizedKioskId);
      setErrorMessage("");

      // 1. Emit via Socket.IO for immediate local bridge
      const socket = getSocket() || initSocket();
      if (socket) {
        socket.emit("kiosk_trigger_print", {
          kioskId: sanitizedKioskId,
          query: scannerOrder.orderNumber,
        });
      }

      // 2. Call backend REST endpoint
      await triggerKioskPrint({
        kioskId: sanitizedKioskId,
        query: scannerOrder.orderNumber,
      }).unwrap();

      setScanStatus("success");

      // Update local state to show tickets as printed
      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          if (o.id === scannerOrder.id) {
            return {
              ...o,
              tickets: (o.tickets || []).map((t) => ({
                ...t,
                printCount: (t.printCount || 0) + 1,
                printedAt: new Date().toISOString(),
              })),
            };
          }
          return o;
        })
      );
    } catch (err: any) {
      console.error("Kiosk print failed:", err);
      setErrorMessage(
        err?.data?.message || err?.message || "Gagal mengirim perintah cetak ke Kiosk."
      );
      setScanStatus("error");
    }
  };

  const handleBarcodeScanned = useCallback(
    (event: { nativeEvent: { codeStringValue: string } }) => {
      const rawCode = event?.nativeEvent?.codeStringValue;
      if (!rawCode || isScanningLocked.current || scanStatus === "printing" || scanStatus === "success") {
        return;
      }

      const parsedId = parseKioskIdFromScannedCode(rawCode);
      if (!parsedId) {
        // Ignore noise or invalid QR codes gracefully
        return;
      }

      isScanningLocked.current = true;
      executeKioskPrint(parsedId);
    },
    [scannerOrder, scanStatus]
  );

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
            {filteredOrders.map((order) => {
              const isPaid = order.orderStatus === "PAID" || order.paymentStatus === "PAID";
              const isAlreadyPrinted = (order.tickets || []).some(
                (t) => (t.printCount || 0) > 0 || !!t.printedAt
              );

              return (
                <Card key={order.id} style={styles.orderCard}>
                  {/* Header info */}
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[styles.orderNumber, { color: colors.text }]}>
                        {order.orderNumber}
                      </Text>
                      <Text style={[styles.movieTitle, { color: colors.primary }]} numberOfLines={2}>
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
                              hour12: false,
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

                  {/* Individual Seat Tickets */}
                  <View style={styles.ticketsContainer}>
                    <Text style={[styles.ticketsTitle, { color: colors.textMuted }]}>
                      Daftar Kursi ({order.tickets?.length || 0} Tiket)
                    </Text>

                    {order.tickets?.map((ticket) => (
                      <View
                        key={ticket.id}
                        style={[styles.ticketItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                      >
                        {/* Seat Badge */}
                        <View style={[styles.seatBadgeBox, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                          <Armchair size={20} color={colors.primary} />
                          <Text style={[styles.seatBadgeText, { color: colors.primary }]}>
                            {ticket.showtimeSeat?.seat?.seatLabel || "-"}
                          </Text>
                        </View>

                        {/* Ticket Meta */}
                        <View style={styles.ticketDetails}>
                          <View style={styles.ticketTopRow}>
                            <Text style={[styles.ticketCode, { color: colors.text }]}>
                              No: {ticket.ticketNumber}
                            </Text>
                            {getTicketStatusBadge(ticket.status)}
                          </View>
                          <Text style={[styles.ticketSubMeta, { color: colors.textMuted }]}>
                            {order.schedule?.studio?.name || "Studio"} • {order.schedule?.ticketPrice ? `Rp ${order.schedule.ticketPrice.toLocaleString("id-ID")}` : "Rp 0"}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* KIOSK CAMERA SCANNER ACTION (Direct Scan to Print) */}
                  {isPaid && (
                    isAlreadyPrinted ? (
                      <View style={[styles.kioskPrintedNotice, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                        <View style={styles.kioskPrintedBadgeRow}>
                          <CheckCircle2 size={15} color={colors.success} />
                          <Text style={[styles.kioskPrintedBadgeText, { color: colors.success }]}>
                            Tiket Fisik Sudah Dicetak di Kiosk
                          </Text>
                        </View>
                        <Text style={[styles.kioskPrintedNoticeSubtext, { color: colors.textMuted }]}>
                          Sesuai kebijakan bioskop, tiket kiosk hanya dapat dicetak 1x untuk mencegah tiket ganda. Silakan hubungi kasir jika memerlukan bantuan.
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.kioskScanBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleOpenScanner(order)}
                        activeOpacity={0.8}
                      >
                        <Scan size={18} color="#ffffff" />
                        <Text style={styles.kioskScanBtnText}>Scan Barcode Kiosk untuk Cetak Tiket</Text>
                      </TouchableOpacity>
                    )
                  )}
                </Card>
              );
            })}
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

      {/* LIVE CAMERA BARCODE SCANNER MODAL */}
      <Modal
        visible={!!scannerOrder}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={handleCloseScanner}
      >
        {scannerOrder && (
          <SafeAreaView style={styles.scannerContainer}>
            {/* Top Bar */}
            <View style={styles.scannerTopBar}>
              <TouchableOpacity
                style={styles.scannerIconButton}
                onPress={handleCloseScanner}
                activeOpacity={0.7}
              >
                <X size={22} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.scannerHeaderTitleBox}>
                <Text style={styles.scannerHeaderTitle}>Scan Barcode Kiosk</Text>
                <Text style={styles.scannerHeaderSubtitle}>Pindai QR pada Layar Mesin Kiosk</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.scannerIconButton,
                  isTorchOn && { backgroundColor: colors.primary },
                ]}
                onPress={() => setIsTorchOn(!isTorchOn)}
                activeOpacity={0.7}
              >
                {isTorchOn ? (
                  <Zap size={20} color="#ffffff" />
                ) : (
                  <ZapOff size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>

            {/* Order Info Chip */}
            <View style={styles.scannerOrderPill}>
              <Film size={14} color={colors.primary} />
              <Text style={styles.scannerOrderPillTitle} numberOfLines={1}>
                {scannerOrder.schedule?.movie?.title || "Planet Cinema"}
              </Text>
              <Text style={styles.scannerOrderPillSeats}>
                • {scannerOrder.tickets?.length} Kursi ({scannerOrder.tickets?.map((t) => t.showtimeSeat?.seat?.seatLabel).join(", ")})
              </Text>
            </View>

            {/* Camera Viewfinder View */}
            <View style={styles.cameraWrapper}>
              {hasCameraPermission === false ? (
                <View style={styles.permissionDeniedBox}>
                  <AlertCircle size={44} color="#ef4444" />
                  <Text style={styles.permissionDeniedTitle}>Akses Kamera Diperlukan</Text>
                  <Text style={styles.permissionDeniedSubtitle}>
                    Aplikasi memerlukan izin kamera untuk memindai barcode mesin kiosk di bioskop.
                  </Text>
                  <Button
                    title="Minta Izin Kamera"
                    onPress={requestCameraPermission}
                    size="small"
                    style={{ marginTop: 12 }}
                  />
                </View>
              ) : (
                <>
                  <Camera
                    style={StyleSheet.absoluteFill}
                    cameraType={CameraType.Back}
                    scanBarcode={scanStatus === "scanning"}
                    onReadCode={handleBarcodeScanned}
                    showFrame={true}
                    laserColor={colors.primary}
                    frameColor={colors.primary}
                    torchMode={isTorchOn ? "on" : "off"}
                  />

                  {/* Scanning Animation Reticle Overlay */}
                  <View style={styles.scannerOverlay}>
                    <View style={[styles.scanTargetBox, { borderColor: colors.primary }]}>
                      <View style={[styles.cornerTopLeft, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerTopRight, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerBottomLeft, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerBottomRight, { borderColor: colors.primary }]} />
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Bottom Status & Instruction Panel */}
            <View style={styles.scannerBottomCard}>
              {scanStatus === "printing" ? (
                <View style={styles.statusBox}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.statusTitle}>
                    Barcode Kiosk {detectedKioskId} Terdeteksi!
                  </Text>
                  <Text style={styles.statusSubtitle}>
                    Sedang mengirim perintah cetak ke mesin kiosk di depan Anda...
                  </Text>
                </View>
              ) : scanStatus === "success" ? (
                <View style={styles.statusBox}>
                  <View style={styles.successIconCircle}>
                    <CheckCircle2 size={40} color="#10b981" />
                  </View>
                  <Text style={styles.statusTitle}>Perintah Cetak Terkirim!</Text>
                  <Text style={styles.statusSubtitle}>
                    Mesin Kiosk <Text style={{ color: colors.primary, fontWeight: "bold" }}>{detectedKioskId}</Text> sedang mencetak tiket fisik Anda. Silakan ambil di slot pengeluaran tiket.
                  </Text>
                  <Button
                    title="Selesai"
                    onPress={handleCloseScanner}
                    size="large"
                    style={{ width: "100%", marginTop: 14 }}
                  />
                </View>
              ) : scanStatus === "error" ? (
                <View style={styles.statusBox}>
                  <AlertCircle size={36} color="#ef4444" />
                  <Text style={[styles.statusTitle, { color: "#ef4444" }]}>Gagal Mencetak</Text>
                  <Text style={styles.statusSubtitle}>
                    {errorMessage || "Barcode tidak cocok atau mesin Kiosk sedang tidak terhubung."}
                  </Text>
                  <View style={styles.errorActionRow}>
                    <Button
                      title="Pindai Ulang"
                      variant="primary"
                      onPress={() => {
                        setScanStatus("scanning");
                        setErrorMessage("");
                        isScanningLocked.current = false;
                      }}
                      icon={<RefreshCw size={16} color="#ffffff" />}
                      size="medium"
                    />
                    <Button
                      title="Tutup"
                      variant="outline"
                      onPress={handleCloseScanner}
                      size="medium"
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.instructionContainer}>
                  <View style={styles.instructionRow}>
                    <CameraIcon size={20} color={colors.primary} />
                    <Text style={styles.instructionText}>
                      Arahkan kamera ke Barcode / QR Code pada layar mesin Kiosk untuk mencetak tiket secara otomatis.
                    </Text>
                  </View>

                  {/* Collapsible Manual Input Fallback */}
                  {!showManualInput ? (
                    <TouchableOpacity
                      style={styles.manualInputToggle}
                      onPress={() => setShowManualInput(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.manualInputToggleText}>
                        Kamera bermasalah? Ketik ID Kiosk manual
                      </Text>
                      <ChevronRight size={14} color="#9ca3af" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.manualInputBox}>
                      <TextInput
                        style={styles.manualTextInput}
                        placeholder="Contoh: KIOSK-01"
                        placeholderTextColor="#6b7280"
                        value={manualKioskId}
                        onChangeText={setManualKioskId}
                        autoCapitalize="characters"
                      />
                      <Button
                        title="Cetak"
                        size="small"
                        onPress={() => {
                          if (manualKioskId.trim()) {
                            executeKioskPrint(manualKioskId.trim());
                          }
                        }}
                        loading={isTriggeringPrint}
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          </SafeAreaView>
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
    gap: 8,
  },
  ticketsTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  ticketItem: {
    flexDirection: "row",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    alignItems: "center",
  },
  seatBadgeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  seatBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },
  ticketDetails: {
    flex: 1,
    gap: 2,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketCode: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  ticketSubMeta: {
    fontSize: 11,
    fontWeight: "500",
  },
  kioskScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 2,
  },
  kioskScanBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  kioskPrintedNotice: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 2,
  },
  kioskPrintedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  kioskPrintedBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  kioskPrintedNoticeSubtext: {
    fontSize: 11,
    lineHeight: 16,
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

  /* CAMERA SCANNER FULLSCREEN STYLES */
  scannerContainer: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  scannerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  scannerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  scannerHeaderTitleBox: {
    alignItems: "center",
  },
  scannerHeaderTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  scannerHeaderSubtitle: {
    color: "#a1a1aa",
    fontSize: 11,
    marginTop: 2,
  },
  scannerOrderPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#27272a",
    marginBottom: 8,
    maxWidth: width - 32,
    zIndex: 10,
  },
  scannerOrderPillTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  scannerOrderPillSeats: {
    color: "#a1a1aa",
    fontSize: 11,
    fontWeight: "600",
  },
  cameraWrapper: {
    flex: 1,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#000000",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scanTargetBox: {
    width: 250,
    height: 250,
    position: "relative",
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  permissionDeniedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  permissionDeniedTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  permissionDeniedSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  scannerBottomCard: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: "#27272a",
    padding: 20,
    minHeight: 160,
    justifyContent: "center",
  },
  statusBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  statusSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 300,
  },
  errorActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  instructionContainer: {
    gap: 12,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  instructionText: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  manualInputToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#27272a",
    marginTop: 4,
  },
  manualInputToggleText: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "600",
  },
  manualInputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  manualTextInput: {
    flex: 1,
    backgroundColor: "#09090b",
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 10,
    color: "#ffffff",
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    fontFamily: "monospace",
    fontWeight: "700",
  },
});
