import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Calendar, Clock, Armchair, CheckCircle2, Scan } from "lucide-react-native";
import { Order } from "../../types/booking";
import { Card } from "../common/Card";
import { Badge } from "../common/Badge";

interface TicketCardItemProps {
  order: Order;
  colors: any;
  onOpenScanner: (order: Order) => void;
}

export const TicketCardItem: React.FC<TicketCardItemProps> = ({
  order,
  colors,
  onOpenScanner,
}) => {
  const isPaid = order.orderStatus === "PAID" || order.paymentStatus === "PAID";
  const isAlreadyPrinted = (order.tickets || []).some(
    (t) => (t.printCount || 0) > 0 || !!t.printedAt
  );

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge label="ACTIVE" variant="success" />;
      case "USED":
        return <Badge label="USED" variant="muted" />;
      case "CANCELLED":
        return <Badge label="CANCELLED" variant="danger" />;
      default:
        return <Badge label={status} variant="warning" />;
    }
  };

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
                {order.schedule?.studio?.name || "Studio"} •{" "}
                {order.schedule?.ticketPrice
                  ? `Rp ${order.schedule.ticketPrice.toLocaleString("id-ID")}`
                  : "Rp 0"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* KIOSK CAMERA SCANNER ACTION (Direct Scan to Print) */}
      {isPaid &&
        (isAlreadyPrinted ? (
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
            onPress={() => onOpenScanner(order)}
            activeOpacity={0.8}
          >
            <Scan size={18} color="#ffffff" />
            <Text style={styles.kioskScanBtnText}>Scan Barcode Kiosk untuk Cetak Tiket</Text>
          </TouchableOpacity>
        ))}
    </Card>
  );
};

const styles = StyleSheet.create({
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
});
