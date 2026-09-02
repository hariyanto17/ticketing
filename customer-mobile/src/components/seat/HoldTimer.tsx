import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Timer } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

interface HoldTimerProps {
  reservedUntil: Date | null;
  onExpired: () => void;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({ reservedUntil, onExpired }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!reservedUntil) return;

    const updateTimer = () => {
      const remainingMs = new Date(reservedUntil).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft(0);
        onExpired();
      } else {
        setTimeLeft(Math.floor(remainingMs / 1000));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil, onExpired]);

  if (!reservedUntil || timeLeft <= 0) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <View style={[styles.container, { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "#f59e0b" }]}>
      <Timer size={16} color="#f59e0b" />
      <Text style={styles.text}>
        {t("seat.timerPrefix")} <Text style={styles.timeBold}>{formatted}</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
  },
  text: {
    fontSize: 13,
    color: "#f59e0b",
    fontWeight: "600",
  },
  timeBold: {
    fontWeight: "800",
    fontSize: 14,
  },
});
