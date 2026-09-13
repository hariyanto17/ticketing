import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Clock, Calendar, ShieldCheck, Ticket, Users, UserCheck, PenTool, Clapperboard, Building2, Play } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { useGetMovieByIdQuery } from "../lib/api/movieApi";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { FullscreenTrailerModal } from "../components/movie/FullscreenTrailerModal";
// @ts-ignore
import Video from "react-native-video";

type MovieDetailRouteProp = RouteProp<RootStackParamList, "MovieDetail">;
type MovieDetailNavProp = StackNavigationProp<RootStackParamList>;

import { formatDuration, getCensorshipVariant } from "../utils/format";

const { width } = Dimensions.get("window");

export const MovieDetailScreen: React.FC = () => {
  const navigation = useNavigation<MovieDetailNavProp>();
  const route = useRoute<MovieDetailRouteProp>();
  const { colors } = useTheme();
  const { t, locale } = useLanguage();
  const [videoError, setVideoError] = useState(false);
  const [isFullscreenTrailer, setIsFullscreenTrailer] = useState(false);

  const movieId = route.params.movieId;
  const { data: movie, isLoading, error } = useGetMovieByIdQuery(movieId);

  if (isLoading || !movie) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const durationText = formatDuration(movie.durationMinutes, locale, t("common.durationUnavailable"));
  const genreString = movie.genres?.map((g) => g.genre.name).join(", ") || "General";
  const hasTrailer = !!movie.trailerUrl && !videoError;
  const castText = movie.cast || movie.player;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={movie.title} showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Poster & Backdrop Trailer */}
        <View style={styles.posterSection}>
          {hasTrailer ? (
            <Video
              source={{ uri: movie.trailerUrl! }}
              style={styles.backdrop}
              resizeMode="cover"
              repeat={true}
              muted={true}
              paused={isFullscreenTrailer}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="obey"
              onError={() => setVideoError(true)}
            />
          ) : (
            <Image
              source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80" }}
              style={styles.backdrop}
              resizeMode="cover"
            />
          )}
          <View style={styles.backdropGradient} pointerEvents="none" />

          {/* Floating Watch Fullscreen Trailer Pill on Backdrop */}
          {movie.trailerUrl && (
            <TouchableOpacity
              style={styles.backdropTrailerButton}
              onPress={() => setIsFullscreenTrailer(true)}
              activeOpacity={0.85}
            >
              <View style={styles.playIconCircle}>
                <Play size={14} color="#ffffff" fill="#ffffff" />
              </View>
              <Text style={styles.backdropTrailerText}>{t("movieDetail.watchTrailer")}</Text>
            </TouchableOpacity>
          )}

          <View style={styles.floatingPosterContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (movie.trailerUrl) setIsFullscreenTrailer(true);
              }}
              style={styles.posterWrapper}
            >
              <Image
                source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80" }}
                style={[styles.floatingPoster, { borderColor: colors.cardBorder }]}
                resizeMode="cover"
              />
              {movie.trailerUrl && (
                <View style={styles.posterPlayOverlay}>
                  <Play size={20} color="#ffffff" fill="#ffffff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.metaColumn}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {movie.title}
              </Text>
              <View style={styles.genreBadgeRow}>
                <Text style={[styles.genres, { color: colors.textMuted }]}>{genreString}</Text>
                <Badge
                  label={movie.censorshipRating || "SU"}
                  variant={getCensorshipVariant(movie.censorshipRating)}
                />
              </View>

              {movie.trailerUrl && (
                <TouchableOpacity
                  style={[styles.metaTrailerBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsFullscreenTrailer(true)}
                  activeOpacity={0.8}
                >
                  <Play size={13} color="#ffffff" fill="#ffffff" />
                  <Text style={styles.metaTrailerText}>{t("movieDetail.watchTrailer")}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={[styles.infoRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.infoItem}>
            <Clock size={18} color={colors.primary} />
            <Text style={[styles.infoValue, { color: colors.text }]}>{durationText}</Text>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t("movieDetail.duration")}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.infoItem}>
            <ShieldCheck size={18} color={colors.primary} />
            <Text style={[styles.infoValue, { color: colors.text }]}>{movie.censorshipRating || "SU"}</Text>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t("movieDetail.rating")}</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.infoItem}>
            <Calendar size={18} color={colors.primary} />
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "2026"}
            </Text>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{t("movieDetail.releaseDate")}</Text>
          </View>
        </View>

        {/* Synopsis */}
        <View style={styles.synopsisSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("movieDetail.synopsis")}</Text>
          <Text style={[styles.synopsisText, { color: colors.textMuted }]}>
            {movie.synopsis || "Sinopsis untuk film ini belum tersedia saat ini."}
          </Text>
        </View>

        {/* Cast & Crew Section */}
        <View style={styles.castSection}>
          {castText ? (
            <View style={[styles.crewCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.crewHeader}>
                <Users size={16} color={colors.primary} />
                <Text style={[styles.crewLabel, { color: colors.textMuted }]}>{t("movieDetail.cast")}</Text>
              </View>
              <Text style={[styles.crewValue, { color: colors.text }]}>{castText}</Text>
            </View>
          ) : null}

          <View style={styles.crewGrid}>
            {movie.director ? (
              <View style={[styles.crewCardHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.crewHeader}>
                  <UserCheck size={15} color={colors.primary} />
                  <Text style={[styles.crewLabel, { color: colors.textMuted }]}>{t("movieDetail.director")}</Text>
                </View>
                <Text style={[styles.crewValue, { color: colors.text }]}>{movie.director}</Text>
              </View>
            ) : null}

            {movie.writer ? (
              <View style={[styles.crewCardHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.crewHeader}>
                  <PenTool size={15} color={colors.primary} />
                  <Text style={[styles.crewLabel, { color: colors.textMuted }]}>{t("movieDetail.writer")}</Text>
                </View>
                <Text style={[styles.crewValue, { color: colors.text }]}>{movie.writer}</Text>
              </View>
            ) : null}

            {movie.producer ? (
              <View style={[styles.crewCardHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.crewHeader}>
                  <Clapperboard size={15} color={colors.primary} />
                  <Text style={[styles.crewLabel, { color: colors.textMuted }]}>{t("movieDetail.producer")}</Text>
                </View>
                <Text style={[styles.crewValue, { color: colors.text }]}>{movie.producer}</Text>
              </View>
            ) : null}

            {movie.productionHouse?.name ? (
              <View style={[styles.crewCardHalf, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.crewHeader}>
                  <Building2 size={15} color={colors.primary} />
                  <Text style={[styles.crewLabel, { color: colors.textMuted }]}>{t("movieDetail.productionHouse")}</Text>
                </View>
                <Text style={[styles.crewValue, { color: colors.text }]}>{movie.productionHouse.name}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {/* Action Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <Button
          title={t("movieDetail.selectShowtime")}
          onPress={() => navigation.navigate("Showtime", { movie })}
          icon={<Ticket size={18} color="#ffffff" />}
          size="large"
        />
      </View>

      {/* Fullscreen Video Trailer Player Modal */}
      <FullscreenTrailerModal
        visible={isFullscreenTrailer}
        movieTitle={movie.title}
        trailerUrl={movie.trailerUrl}
        onClose={() => setIsFullscreenTrailer(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  posterSection: {
    position: "relative",
    height: 280,
    marginBottom: 16,
  },
  backdrop: {
    width: "100%",
    height: 200,
  },
  backdropGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  backdropTrailerButton: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    gap: 6,
  },
  playIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
  },
  backdropTrailerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  floatingPosterContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  posterWrapper: {
    position: "relative",
  },
  floatingPoster: {
    width: 110,
    height: 155,
    borderRadius: 14,
    borderWidth: 2,
  },
  posterPlayOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e11d48",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  metaColumn: {
    flex: 1,
    gap: 6,
    paddingBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  genres: {
    fontSize: 13,
  },
  genreBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  metaTrailerBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 2,
  },
  metaTrailerText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 14,
    justifyContent: "space-around",
    alignItems: "center",
    marginBottom: 20,
  },
  infoItem: {
    alignItems: "center",
    gap: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoLabel: {
    fontSize: 11,
  },
  divider: {
    width: 1,
    height: 32,
  },
  synopsisSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  synopsisText: {
    fontSize: 14,
    lineHeight: 22,
  },
  castSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  crewCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  crewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  crewCardHalf: {
    flex: 1,
    minWidth: (width - 42) / 2,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  crewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  crewLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  crewValue: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
