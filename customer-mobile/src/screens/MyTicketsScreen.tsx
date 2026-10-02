import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Search, Ticket, X } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Order } from "../types/booking";
import { useLazyLookupBookingsQuery, useTriggerKioskPrintMutation } from "../lib/api/bookingApi";
import { initSocket, getSocket } from "../services/socketService";
import { parseKioskIdFromScannedCode } from "../utils/kiosk";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { useAppSelector } from "../lib/store";
import { KioskScannerModal } from "../components/tickets/KioskScannerModal";
import { TicketCardItem } from "../components/tickets/TicketCardItem";
import { TicketsFilterTabs } from "../components/tickets/TicketsFilterTabs";
import { RecentBookingsSection } from "../components/tickets/RecentBookingsSection";

type MyTicketsRouteProp = RouteProp<RootStackParamList, "MyTickets">;

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
  const [scanStatus, setScanStatus] = useState<"scanning" | "printing" | "success" | "error">("scanning");
  const [detectedKioskId, setDetectedKioskId] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const isScanningLocked = useRef<boolean>(false);

  const [triggerLookup, { isFetching: loading }] = useLazyLookupBookingsQuery();
  const [triggerKioskPrint, { isLoading: isTriggeringPrint }] = useTriggerKioskPrintMutation();

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

      const socket = getSocket() || initSocket();
      if (socket) {
        socket.emit("kiosk_trigger_print", {
          kioskId: sanitizedKioskId,
          query: scannerOrder.orderNumber,
        });
      }

      await triggerKioskPrint({
        kioskId: sanitizedKioskId,
        query: scannerOrder.orderNumber,
      }).unwrap();

      setScanStatus("success");

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
        return;
      }

      isScanningLocked.current = true;
      executeKioskPrint(parsedId);
    },
    [scannerOrder, scanStatus]
  );

  const paidOrdersCount = orders.filter((o) => o.orderStatus === "PAID" || o.paymentStatus === "PAID").length;
  const cancelledOrdersCount = orders.filter((o) => o.orderStatus === "CANCELLED" || o.paymentStatus === "FAILED").length;
  const allOrdersCount = orders.length;

  const filteredOrders = orders.filter((order) => {
    if (selectedFilter === "PAID") {
      return order.orderStatus === "PAID" || order.paymentStatus === "PAID";
    }
    if (selectedFilter === "CANCELLED") {
      return order.orderStatus === "CANCELLED" || order.paymentStatus === "FAILED";
    }
    return true;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("myTickets.title")} />

      {/* Search Input */}
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
            returnKeyType="search"
            autoCapitalize="characters"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      {orders.length > 0 && (
        <TicketsFilterTabs
          selectedFilter={selectedFilter}
          onSelectFilter={setSelectedFilter}
          allOrdersCount={allOrdersCount}
          paidOrdersCount={paidOrdersCount}
          cancelledOrdersCount={cancelledOrdersCount}
          colors={colors}
          t={t}
        />
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Recent Bookings Fast Chips */}
        {!hasSearched && (
          <RecentBookingsSection
            recentBookings={recentBookings}
            onSelectBooking={(orderNum) => {
              setQuery(orderNum);
              handleSearch(orderNum);
            }}
            colors={colors}
            t={t}
          />
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
              <TicketCardItem
                key={order.id}
                order={order}
                colors={colors}
                onOpenScanner={handleOpenScanner}
              />
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

      {/* LIVE CAMERA BARCODE SCANNER MODAL */}
      <KioskScannerModal
        visible={!!scannerOrder}
        order={scannerOrder}
        onClose={handleCloseScanner}
        colors={colors}
        hasCameraPermission={hasCameraPermission}
        requestCameraPermission={requestCameraPermission}
        scanStatus={scanStatus}
        setScanStatus={setScanStatus}
        detectedKioskId={detectedKioskId}
        errorMessage={errorMessage}
        setErrorMessage={setErrorMessage}
        handleBarcodeScanned={handleBarcodeScanned}
        executeKioskPrint={executeKioskPrint}
        isTriggeringPrint={isTriggeringPrint}
        isScanningLockedRef={isScanningLocked}
      />
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
  ordersList: {
    gap: 16,
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
});
