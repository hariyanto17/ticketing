import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Dimensions,
} from "react-native";
import { Sparkles, Download, ArrowUpCircle, AlertCircle, CheckCircle2, X } from "lucide-react-native";
import { OtaCheckResult, OtaProgressData, otaService } from "../../services/otaService";
import { useTheme } from "../../context/ThemeContext";
import { Button } from "./Button";

interface OtaUpdateModalProps {
  visible: boolean;
  updateInfo: OtaCheckResult | null;
  onDismiss: () => void;
}

const { width } = Dimensions.get("window");

export const OtaUpdateModal: React.FC<OtaUpdateModalProps> = ({
  visible,
  updateInfo,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const [downloading, setDownloading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!updateInfo || !visible) return null;

  const isBinary = updateInfo.updateType === "NATIVE_BINARY";
  const isMandatory = updateInfo.isMandatory;

  const handleStartUpdate = async () => {
    if (isBinary) {
      if (updateInfo.binaryDownloadUrl) {
        Linking.openURL(updateInfo.binaryDownloadUrl);
      }
      return;
    }

    try {
      setDownloading(true);
      setErrorMsg(null);
      setProgress(0);

      await otaService.downloadAndApplyUpdate(updateInfo, (data: OtaProgressData) => {
        setProgress(data.progress);
        if (data.total > 0) {
          const dlMb = (data.downloaded / (1024 * 1024)).toFixed(1);
          const totalMb = (data.total / (1024 * 1024)).toFixed(1);
          setProgressText(`${dlMb} MB / ${totalMb} MB (${Math.round(data.progress * 100)}%)`);
        } else {
          setProgressText(`${Math.round(data.progress * 100)}%`);
        }
      });
    } catch (err: any) {
      console.error("OTA Download error:", err);
      setDownloading(false);
      setErrorMsg(err?.message || "Gagal mengunduh pembaruan. Silakan coba lagi.");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        if (!isMandatory && !downloading) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          {/* Close button if not mandatory */}
          {!isMandatory && !downloading && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Top Icon */}
          <View style={[styles.iconCircle, { backgroundColor: "rgba(225, 29, 72, 0.15)" }]}>
            {isBinary ? (
              <ArrowUpCircle size={32} color={colors.primary} />
            ) : (
              <Sparkles size={32} color={colors.primary} />
            )}
          </View>

          {/* Title & Version */}
          <Text style={[styles.title, { color: colors.text }]}>
            {isMandatory ? "Pembaruan Wajib Tersedia" : "Pembaruan Baru Tersedia"}
          </Text>

          <View style={[styles.versionBadge, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.versionText, { color: colors.primary }]}>
              {isBinary
                ? `Versi ${updateInfo.latestAppVersion}`
                : `Patch OTA #${updateInfo.latestBundleVersion}`}
            </Text>
          </View>

          {/* Release Notes */}
          <View style={[styles.notesContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.notesLabel, { color: colors.textMuted }]}>
              Catatan Pembaruan:
            </Text>
            <Text style={[styles.notesText, { color: colors.text }]}>
              {updateInfo.releaseNotes || "Peningkatan performa dan perbaikan bug sistem bioskop."}
            </Text>
          </View>

          {/* Error Message */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color="#ef4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Download Progress Bar */}
          {downloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { backgroundColor: colors.primary, width: `${Math.min(100, Math.max(5, progress * 100))}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
                {progressText || "Mengunduh file paket..."}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={
                downloading
                  ? "Sedang Menerapkan..."
                  : isBinary
                  ? "Buka Play Store"
                  : "Perbarui Sekarang"
              }
              onPress={handleStartUpdate}
              loading={downloading}
              size="large"
              icon={!downloading ? <Download size={18} color="#ffffff" /> : undefined}
              style={{ width: "100%" }}
            />

            {!isMandatory && !downloading && (
              <TouchableOpacity
                style={styles.laterBtn}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={[styles.laterBtnText, { color: colors.textMuted }]}>
                  Nanti Saja
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: Math.min(width - 48, 380),
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 12,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  versionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  notesContainer: {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  progressSection: {
    width: "100%",
    marginBottom: 16,
    gap: 6,
  },
  progressBarTrack: {
    width: "100%",
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    width: "100%",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    flex: 1,
  },
  actionButtons: {
    width: "100%",
    gap: 10,
  },
  laterBtn: {
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  laterBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
