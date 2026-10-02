import React from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { QrCode, Clock, Smartphone, ShieldCheck } from "lucide-react-native";
import { Card } from "../common/Card";
import { NonRefundableBanner } from "../common/NonRefundableBanner";

interface QrisDisplayCardProps {
  totalPayAmount: number;
  formatCurrency: (val: number) => string;
  isExpired: boolean;
  remainingSeconds: number;
  formatCountdown: (secs: number) => string;
  activeQrString?: string;
  activeQrUrl?: string;
  colors: any;
  t: (key: string) => string;
}

export const QrisDisplayCard: React.FC<QrisDisplayCardProps> = ({
  totalPayAmount,
  formatCurrency,
  isExpired,
  remainingSeconds,
  formatCountdown,
  activeQrString,
  activeQrUrl,
  colors,
  t,
}) => {
  return (
    <>
      {/* Amount & Expiry Header Card */}
      <View style={[styles.amountCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
          {t("summary.totalPay")}
        </Text>
        <Text style={[styles.amountValue, { color: colors.primary }]}>
          {formatCurrency(totalPayAmount)}
        </Text>

        {/* Countdown Badge */}
        <View
          style={[
            styles.timerBadge,
            { backgroundColor: isExpired ? "rgba(239,68,68,0.15)" : "rgba(225,29,72,0.1)" },
          ]}
        >
          <Clock size={16} color={isExpired ? colors.danger : colors.primary} />
          <Text style={[styles.timerText, { color: isExpired ? colors.danger : colors.primary }]}>
            {isExpired
              ? t("payment.timeOutBadge")
              : `${t("payment.validTimeBadge")} ${formatCountdown(remainingSeconds)}`}
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

      {/* Non-Refundable Notice */}
      <NonRefundableBanner style={{ borderRadius: 12, borderWidth: 1, marginBottom: 12 }} />

      {/* Guarantee Security Notice */}
      <View style={[styles.securityNotice, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <ShieldCheck size={18} color={colors.success} />
        <Text style={[styles.securityText, { color: colors.textMuted }]}>
          {t("payment.securityNotice")}
        </Text>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  timerText: {
    fontSize: 12,
    fontWeight: "800",
  },
  qrCard: {
    padding: 20,
    borderRadius: 20,
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
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qrWhiteBox: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  qrImage: {
    width: 210,
    height: 210,
  },
  qrWhiteBoxPlaceholder: {
    width: 230,
    height: 230,
    backgroundColor: "rgba(0,0,0,0.05)",
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
  },
  supportText: {
    fontSize: 11,
    fontWeight: "500",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    width: "100%",
    justifyContent: "center",
  },
  statusBannerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
