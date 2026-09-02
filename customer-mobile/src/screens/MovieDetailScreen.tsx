import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Clock, Calendar, ShieldCheck, Ticket } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Movie } from "../types/movie";
import { movieService } from "../services/movieService";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";

type MovieDetailRouteProp = RouteProp<RootStackParamList, "MovieDetail">;
type MovieDetailNavProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

export const MovieDetailScreen: React.FC = () => {
  const navigation = useNavigation<MovieDetailNavProp>();
  const route = useRoute<MovieDetailRouteProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [movie, setMovie] = useState<Movie | null>(null);

  const movieId = route.params.movieId;

  useEffect(() => {
    movieService
      .getMovieById(movieId)
      .then(setMovie)
      .catch((e) => console.error("Failed to load movie detail", e))
      .finally(() => setLoading(false));
  }, [movieId]);

  if (loading || !movie) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const durationText = movie.durationMinutes
    ? `${movie.durationMinutes} ${t("common.minutes")}`
    : t("common.durationUnavailable");

  const genreString = movie.genres?.map((g) => g.genre.name).join(", ") || "General";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={movie.title} showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Poster & Backdrop */}
        <View style={styles.posterSection}>
          <Image
            source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80" }}
            style={styles.backdrop}
            resizeMode="cover"
          />
          <View style={styles.backdropGradient} />

          <View style={styles.floatingPosterContainer}>
            <Image
              source={{ uri: movie.poster || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&q=80" }}
              style={[styles.floatingPoster, { borderColor: colors.cardBorder }]}
              resizeMode="cover"
            />
            <View style={styles.metaColumn}>
              <Badge label={movie.censorshipRating || "SU"} variant="primary" />
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {movie.title}
              </Text>
              <Text style={[styles.genres, { color: colors.textMuted }]}>{genreString}</Text>
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
  floatingPosterContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 14,
  },
  floatingPoster: {
    width: 110,
    height: 155,
    borderRadius: 14,
    borderWidth: 2,
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
    paddingBottom: 24,
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
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
});
