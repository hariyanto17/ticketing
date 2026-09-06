import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Clock } from "lucide-react-native";
import { Movie } from "../../types/movie";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { Badge } from "../common/Badge";

import { formatDuration } from "../../utils/format";

interface MovieCardProps {
  movie: Movie;
  onPress: () => void;
  layout?: "grid" | "list";
}

const { width } = Dimensions.get("window");
const GRID_ITEM_WIDTH = (width - 48) / 2;

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onPress, layout = "grid" }) => {
  const { colors } = useTheme();
  const { t, locale } = useLanguage();

  const durationText = formatDuration(movie.durationMinutes, locale, t("common.durationUnavailable"));

  const genreNames = movie.genres?.map((g) => g.genre.name).slice(0, 2).join(", ") || "";

  if (layout === "list") {
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80" }}
          style={styles.listPoster}
          resizeMode="cover"
        />
        <View style={styles.listContent}>
          <View style={styles.badgeRow}>
            <Badge label={movie.censorshipRating || "SU"} variant="primary" />
            {movie.status === "COMING_SOON" && (
              <Badge label={t("home.comingSoon")} variant="warning" />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {movie.title}
          </Text>

          {genreNames ? (
            <Text style={[styles.genres, { color: colors.textMuted }]} numberOfLines={1}>
              {genreNames}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {durationText}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: GRID_ITEM_WIDTH }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.posterContainer, { borderColor: colors.cardBorder }]}>
        <Image
          source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80" }}
          style={styles.gridPoster}
          resizeMode="cover"
        />
        <View style={styles.floatingBadge}>
          <Badge label={movie.censorshipRating || "SU"} variant="primary" />
        </View>
      </View>

      <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={1}>
        {movie.title}
      </Text>

      <View style={styles.metaRow}>
        <Clock size={12} color={colors.textMuted} />
        <Text style={[styles.gridMeta, { color: colors.textMuted }]} numberOfLines={1}>
          {durationText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    marginBottom: 16,
  },
  posterContainer: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  gridPoster: {
    width: "100%",
    height: "100%",
  },
  floatingBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  gridMeta: {
    fontSize: 12,
  },
  listCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  listPoster: {
    width: 80,
    height: 110,
    borderRadius: 10,
  },
  listContent: {
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  genres: {
    fontSize: 13,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 13,
  },
});
