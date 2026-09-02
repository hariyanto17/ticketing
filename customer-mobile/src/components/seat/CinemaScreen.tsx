import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export const CinemaScreen: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={[styles.curveBar, { backgroundColor: colors.primary, shadowColor: colors.primary }]} />
      <Text style={[styles.screenText, { color: colors.textMuted }]}>
        {t("seat.screen")}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 16,
    width: "100%",
  },
  curveBar: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  screenText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 8,
  },
});
