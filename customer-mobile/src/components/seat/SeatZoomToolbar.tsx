import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react-native";

interface SeatZoomToolbarProps {
  zoomLevel: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  colors: any;
  t: (key: string) => string;
}

export const SeatZoomToolbar: React.FC<SeatZoomToolbarProps> = ({
  zoomLevel,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  colors,
  t,
}) => {
  return (
    <View style={styles.zoomControlContainer}>
      <Text style={[styles.zoomHintText, { color: colors.textMuted }]}>
        {t("seat.zoomHint")}
      </Text>
      <View style={[styles.zoomPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={[styles.zoomBtn, zoomLevel <= 1.0 && styles.zoomBtnDisabled]}
          onPress={onZoomOut}
          disabled={zoomLevel <= 1.0}
          activeOpacity={0.7}
        >
          <ZoomOut size={16} color={zoomLevel <= 1.0 ? colors.textMuted : colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomResetBtn, { borderLeftColor: colors.cardBorder, borderRightColor: colors.cardBorder }]}
          onPress={onResetZoom}
          activeOpacity={0.7}
        >
          <Maximize2 size={12} color={colors.primary} />
          <Text style={[styles.zoomPercentText, { color: colors.primary }]}>
            {zoomLevel === 1.0 ? t("seat.zoomReset") : `${Math.round(zoomLevel * 100)}%`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.zoomBtn, zoomLevel >= 2.2 && styles.zoomBtnDisabled]}
          onPress={onZoomIn}
          disabled={zoomLevel >= 2.2}
          activeOpacity={0.7}
        >
          <ZoomIn size={16} color={zoomLevel >= 2.2 ? colors.textMuted : colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  zoomControlContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  zoomHintText: {
    fontSize: 11,
    fontWeight: "500",
  },
  zoomPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  zoomBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  zoomPercentText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
