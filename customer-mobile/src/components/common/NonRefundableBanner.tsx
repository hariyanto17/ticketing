import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { AlertCircle } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

interface NonRefundableBannerProps {
  style?: ViewStyle;
  compact?: boolean;
}

export const NonRefundableBanner: React.FC<NonRefundableBannerProps> = ({
  style,
  compact = false,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const warningColor = colors.warning || "#f59e0b";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: warningColor + "14",
          borderColor: warningColor + "38",
        },
        compact && styles.containerCompact,
        style,
      ]}
    >
      <AlertCircle
        size={compact ? 14 : 16}
        color={warningColor}
        style={styles.icon}
      />
      <Text
        style={[
          styles.text,
          { color: colors.text },
          compact && styles.textCompact,
        ]}
      >
        {t("summary.nonRefundableNotice")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    gap: 10,
  },
  containerCompact: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
  },
  icon: {
    flexShrink: 0,
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  textCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
});
