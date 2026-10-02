import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CheckCircle2, Clock, XCircle, RefreshCw } from "lucide-react-native";
import { Button } from "../common/Button";

interface PaymentResultViewProps {
  paymentState: "SUCCESS" | "EXPIRED" | "FAILED" | "VERIFYING";
  totalPayAmount: number;
  bookingNumber: string;
  formatCurrency: (val: number) => string;
  t: (key: string) => string;
  colors: any;
  checkingStatus: boolean;
  onCheckStatus: () => void;
  onReselect: () => void;
  onBackToTop: () => void;
}

export const PaymentResultView: React.FC<PaymentResultViewProps> = ({
  paymentState,
  totalPayAmount,
  bookingNumber,
  formatCurrency,
  t,
  colors,
  checkingStatus,
  onCheckStatus,
  onReselect,
  onBackToTop,
}) => {
  if (paymentState === "SUCCESS") {
    return (
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
    );
  }

  if (paymentState === "EXPIRED") {
    return (
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
            onPress={onReselect}
          />
        </View>
      </View>
    );
  }

  return (
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
          onPress={onCheckStatus}
          icon={<RefreshCw size={16} color="#ffffff" />}
          loading={checkingStatus}
        />
        <Button
          title={t("common.back")}
          variant="outline"
          onPress={onBackToTop}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statusCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 8,
  },
  statusAmount: {
    fontSize: 28,
    fontWeight: "900",
    marginVertical: 4,
  },
  statusSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  buttonCol: {
    width: "100%",
    gap: 10,
    marginTop: 20,
    maxWidth: 280,
  },
});
