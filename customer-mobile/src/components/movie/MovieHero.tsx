import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Play } from "lucide-react-native";
import { Movie } from "../../types/movie";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { Badge } from "../common/Badge";

import { formatDuration } from "../../utils/format";

interface MovieHeroProps {
  movie: Movie;
  onPress: () => void;
}

const { width } = Dimensions.get("window");
const HERO_WIDTH = width - 32;

export const MovieHero: React.FC<MovieHeroProps> = ({ movie, onPress }) => {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  const durationText = formatDuration(movie.durationMinutes, locale, t("common.durationUnavailable"));

  return (
    <TouchableOpacity
      style={[styles.container, { width: HERO_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80" }}
        style={styles.backdrop}
        resizeMode="cover"
      />
      <View style={styles.overlay}>
        <View style={styles.topBadges}>
          <Badge label={movie.censorshipRating || "SU"} variant="primary" />
          <Badge label={t("home.featured")} variant="warning" />
        </View>

        <View style={styles.bottomContent}>
          <Text style={styles.title} numberOfLines={2}>
            {movie.title}
          </Text>
          <Text style={styles.meta}>
            {durationText} • {movie.genres?.map((g) => g.genre.name).join(", ") || "Action"}
          </Text>

          <View style={[styles.watchButton, { backgroundColor: colors.primary }]}>
            <Play size={14} color="#ffffff" fill="#ffffff" />
            <Text style={styles.watchText}>{t("movieDetail.selectShowtime")}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    marginHorizontal: 16,
    marginBottom: 20,
  },
  backdrop: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 16,
    justifyContent: "space-between",
  },
  topBadges: {
    flexDirection: "row",
    gap: 8,
  },
  bottomContent: {
    gap: 6,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  meta: {
    color: "#d4d4d8",
    fontSize: 13,
  },
  watchButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  watchText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
