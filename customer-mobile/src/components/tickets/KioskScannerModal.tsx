import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Camera, CameraType } from "react-native-camera-kit";
import {
  X,
  Zap,
  ZapOff,
  Film,
  AlertCircle,
  CheckCircle2,
  Camera as CameraIcon,
  RefreshCw,
  ChevronRight,
} from "lucide-react-native";
import { Order } from "../../types/booking";
import { Button } from "../common/Button";

interface KioskScannerModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  colors: any;
  hasCameraPermission: boolean | null;
  requestCameraPermission: () => void;
  scanStatus: "scanning" | "printing" | "success" | "error";
  setScanStatus: (status: "scanning" | "printing" | "success" | "error") => void;
  detectedKioskId: string;
  errorMessage: string;
  setErrorMessage: (msg: string) => void;
  handleBarcodeScanned: (event: { nativeEvent: { codeStringValue: string } }) => void;
  executeKioskPrint: (kioskId: string) => void;
  isTriggeringPrint: boolean;
  isScanningLockedRef: React.MutableRefObject<boolean>;
}

export const KioskScannerModal: React.FC<KioskScannerModalProps> = ({
  visible,
  order,
  onClose,
  colors,
  hasCameraPermission,
  requestCameraPermission,
  scanStatus,
  setScanStatus,
  detectedKioskId,
  errorMessage,
  setErrorMessage,
  handleBarcodeScanned,
  executeKioskPrint,
  isTriggeringPrint,
  isScanningLockedRef,
}) => {
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualKioskId, setManualKioskId] = useState<string>("");

  if (!order) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.scannerContainer}>
        {/* Top Bar */}
        <View style={styles.scannerTopBar}>
          <TouchableOpacity
            style={styles.scannerIconButton}
            onPress={onClose}
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
            {order.schedule?.movie?.title || "Planet Cinema"}
          </Text>
          <Text style={styles.scannerOrderPillSeats}>
            • {order.tickets?.length} Kursi ({order.tickets?.map((t) => t.showtimeSeat?.seat?.seatLabel).join(", ")})
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
                onPress={onClose}
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
                    isScanningLockedRef.current = false;
                  }}
                  icon={<RefreshCw size={16} color="#ffffff" />}
                  size="medium"
                />
                <Button
                  title="Tutup"
                  variant="outline"
                  onPress={onClose}
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
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: "#09090b",
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  scannerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#18181b",
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
    justifyContent: "center",
    backgroundColor: "#18181b",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  scannerOrderPillTitle: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    maxWidth: 180,
  },
  scannerOrderPillSeats: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  permissionDeniedBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#18181b",
  },
  permissionDeniedTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  permissionDeniedSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
  scanTargetBox: {
    width: 240,
    height: 240,
    position: "relative",
    borderRadius: 16,
  },
  cornerTopLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  scannerBottomCard: {
    backgroundColor: "#18181b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#27272a",
  },
  statusBox: {
    alignItems: "center",
    paddingVertical: 8,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statusTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  statusSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  errorActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  instructionContainer: {
    gap: 14,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  instructionText: {
    flex: 1,
    color: "#d4d4d8",
    fontSize: 13,
    lineHeight: 18,
  },
  manualInputToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#27272a",
    borderRadius: 12,
  },
  manualInputToggleText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  manualInputBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    height: 42,
    backgroundColor: "#27272a",
    borderRadius: 10,
    paddingHorizontal: 12,
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
