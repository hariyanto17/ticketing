import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Film, Ticket, Compass } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import {
  useGetNowShowingMoviesQuery,
  useGetComingSoonMoviesQuery,
} from "../lib/api/movieApi";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { MovieHero } from "../components/movie/MovieHero";
import { MovieCard } from "../components/movie/MovieCard";

type HomeScreenNavProp = StackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"NOW_SHOWING" | "COMING_SOON">("NOW_SHOWING");

  // RTK Query: Dedicated endpoints for Now Showing and Coming Soon movies
  const {
    data: nowShowingMovies = [],
    isLoading: loadingNowShowing,
    isFetching: fetchingNowShowing,
    refetch: refetchNowShowing,
  } = useGetNowShowingMoviesQuery();

  const {
    data: comingSoonMovies = [],
    isLoading: loadingComingSoon,
    isFetching: fetchingComingSoon,
    refetch: refetchComingSoon,
  } = useGetComingSoonMoviesQuery();

  const loading = loadingNowShowing && loadingComingSoon;
  const refreshing = fetchingNowShowing || fetchingComingSoon;

  const onRefresh = () => {
    refetchNowShowing();
    refetchComingSoon();
  };

  const featuredMovie = nowShowingMovies[0] || comingSoonMovies[0];
  const displayedMovies = activeTab === "NOW_SHOWING" ? nowShowingMovies : comingSoonMovies;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={t("common.appName")}
        rightAction={
          <TouchableOpacity
            style={[styles.myTicketButton, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => navigation.navigate("MyTickets", {})}
            activeOpacity={0.8}
          >
            <Ticket size={16} color={colors.primary} />
            <Text style={[styles.myTicketText, { color: colors.text }]}>
              {t("home.myTicketsQuick")}
            </Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t("common.loading")}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {featuredMovie && (
            <View style={styles.heroSection}>
              <MovieHero
                movie={featuredMovie}
                onPress={() => navigation.navigate("MovieDetail", { movieId: featuredMovie.id })}
              />
            </View>
          )}

          {/* Tab Selector: Now Showing vs Coming Soon */}
          <View style={styles.tabSection}>
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[
                  styles.tabItem,
                  activeTab === "NOW_SHOWING" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("NOW_SHOWING")}
                activeOpacity={0.8}
              >
                <Film size={16} color={activeTab === "NOW_SHOWING" ? "#ffffff" : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "NOW_SHOWING" ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {t("home.nowShowing")} ({nowShowingMovies.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabItem,
                  activeTab === "COMING_SOON" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("COMING_SOON")}
                activeOpacity={0.8}
              >
                <Compass size={16} color={activeTab === "COMING_SOON" ? "#ffffff" : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "COMING_SOON" ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {t("home.comingSoon")} ({comingSoonMovies.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Movie Grid */}
          <View style={styles.gridSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {activeTab === "NOW_SHOWING" ? t("home.nowShowing") : t("home.comingSoon")}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Movies", { initialFilter: activeTab })}
              >
                <Text style={[styles.viewAllText, { color: colors.primary }]}>
                  {t("common.viewAll")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.gridContainer}>
              {displayedMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPress={() => navigation.navigate("MovieDetail", { movieId: movie.id })}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "600",
  },
  heroSection: {
    marginTop: 16,
  },
  tabSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  gridSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "700",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  myTicketButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  myTicketText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
