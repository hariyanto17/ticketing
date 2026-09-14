import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Film, Ticket, Compass } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Movie } from "../types/movie";
import {
  useLazyGetNowShowingMoviesQuery,
  useLazyGetComingSoonMoviesQuery,
  PaginationMeta,
} from "../lib/api/movieApi";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { MovieHero } from "../components/movie/MovieHero";
import { MovieCard } from "../components/movie/MovieCard";
import { MovieCardSkeleton } from "../components/movie/MovieCardSkeleton";
import { MovieHeroSkeleton } from "../components/movie/MovieHeroSkeleton";

type HomeScreenNavProp = StackNavigationProp<RootStackParamList>;

const PAGE_LIMIT = 10;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"NOW_SHOWING" | "COMING_SOON">("NOW_SHOWING");

  const [triggerGetNowShowing] = useLazyGetNowShowingMoviesQuery();
  const [triggerGetComingSoon] = useLazyGetComingSoonMoviesQuery();

  // Now Showing State
  const [nowShowingMovies, setNowShowingMovies] = useState<Movie[]>([]);
  const [nowShowingPage, setNowShowingPage] = useState<number>(1);
  const [nowShowingMeta, setNowShowingMeta] = useState<PaginationMeta | null>(null);
  const [loadingMoreNowShowing, setLoadingMoreNowShowing] = useState<boolean>(false);

  // Coming Soon State
  const [comingSoonMovies, setComingSoonMovies] = useState<Movie[]>([]);
  const [comingSoonPage, setComingSoonPage] = useState<number>(1);
  const [comingSoonMeta, setComingSoonMeta] = useState<PaginationMeta | null>(null);
  const [loadingMoreComingSoon, setLoadingMoreComingSoon] = useState<boolean>(false);

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch initial movies for both tabs
  const fetchInitialData = useCallback(async () => {
    try {
      const [nowRes, soonRes] = await Promise.allSettled([
        triggerGetNowShowing({ page: 1, limit: PAGE_LIMIT }, false).unwrap(),
        triggerGetComingSoon({ page: 1, limit: PAGE_LIMIT }, false).unwrap(),
      ]);

      if (nowRes.status === "fulfilled" && nowRes.value) {
        setNowShowingMovies(nowRes.value);
        setNowShowingPage(1);
        setNowShowingMeta((nowRes.value as any)?.meta || null);
      }

      if (soonRes.status === "fulfilled" && soonRes.value) {
        setComingSoonMovies(soonRes.value);
        setComingSoonPage(1);
        setComingSoonMeta((soonRes.value as any)?.meta || null);
      }
    } catch (err) {
      console.error("Failed to load initial movies:", err);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [triggerGetNowShowing, triggerGetComingSoon]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  // Handle infinite scroll / load more
  const handleLoadMore = async () => {
    if (activeTab === "NOW_SHOWING") {
      if (initialLoading || loadingMoreNowShowing || refreshing) return;
      const totalPages = nowShowingMeta?.totalPages ?? 1;
      if (nowShowingPage >= totalPages) return;

      const nextPage = nowShowingPage + 1;
      setLoadingMoreNowShowing(true);
      try {
        const res = await triggerGetNowShowing({ page: nextPage, limit: PAGE_LIMIT }, false).unwrap();
        if (res && res.length > 0) {
          setNowShowingMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newItems = res.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newItems];
          });
          setNowShowingPage(nextPage);
          if ((res as any)?.meta) {
            setNowShowingMeta((res as any).meta);
          }
        }
      } catch (err) {
        console.error("Failed to load more now showing movies:", err);
      } finally {
        setLoadingMoreNowShowing(false);
      }
    } else {
      if (initialLoading || loadingMoreComingSoon || refreshing) return;
      const totalPages = comingSoonMeta?.totalPages ?? 1;
      if (comingSoonPage >= totalPages) return;

      const nextPage = comingSoonPage + 1;
      setLoadingMoreComingSoon(true);
      try {
        const res = await triggerGetComingSoon({ page: nextPage, limit: PAGE_LIMIT }, false).unwrap();
        if (res && res.length > 0) {
          setComingSoonMovies((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newItems = res.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newItems];
          });
          setComingSoonPage(nextPage);
          if ((res as any)?.meta) {
            setComingSoonMeta((res as any).meta);
          }
        }
      } catch (err) {
        console.error("Failed to load more coming soon movies:", err);
      } finally {
        setLoadingMoreComingSoon(false);
      }
    }
  };

  const featuredMovie = nowShowingMovies[0] || comingSoonMovies[0];
  const displayedMovies = activeTab === "NOW_SHOWING" ? nowShowingMovies : comingSoonMovies;
  const isFetchingMore = activeTab === "NOW_SHOWING" ? loadingMoreNowShowing : loadingMoreComingSoon;

  const nowShowingCount = nowShowingMeta?.total ?? nowShowingMovies.length;
  const comingSoonCount = comingSoonMeta?.total ?? comingSoonMovies.length;

  const renderHeader = () => (
    <View>
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
              {t("home.nowShowing")} ({nowShowingCount})
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
              {t("home.comingSoon")} ({comingSoonCount})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Header */}
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
    </View>
  );

  // Skeleton loading for footer during infinite scroll
  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.skeletonFooterGrid}>
          <MovieCardSkeleton />
          <MovieCardSkeleton />
        </View>
      );
    }
    return <View style={{ height: 24 }} />;
  };

  const renderEmpty = () => {
    if (initialLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Film size={40} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          {t("home.noMoviesFound") || "Tidak ada film"}
        </Text>
      </View>
    );
  };

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

      {initialLoading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Skeleton Hero Banner */}
          <MovieHeroSkeleton />

          {/* Tab Selector Skeleton */}
          <View style={styles.tabSection}>
            <View style={[styles.tabBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View
                style={[
                  styles.tabItem,
                  activeTab === "NOW_SHOWING" && { backgroundColor: colors.primary },
                ]}
              >
                <Film size={16} color={activeTab === "NOW_SHOWING" ? "#ffffff" : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "NOW_SHOWING" ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {t("home.nowShowing")}
                </Text>
              </View>

              <View
                style={[
                  styles.tabItem,
                  activeTab === "COMING_SOON" && { backgroundColor: colors.primary },
                ]}
              >
                <Compass size={16} color={activeTab === "COMING_SOON" ? "#ffffff" : colors.textMuted} />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === "COMING_SOON" ? "#ffffff" : colors.textMuted },
                  ]}
                >
                  {t("home.comingSoon")}
                </Text>
              </View>
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {activeTab === "NOW_SHOWING" ? t("home.nowShowing") : t("home.comingSoon")}
            </Text>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              {t("common.viewAll")}
            </Text>
          </View>

          {/* Initial Grid Skeletons */}
          <View style={styles.skeletonInitialGrid}>
            <MovieCardSkeleton />
            <MovieCardSkeleton />
            <MovieCardSkeleton />
            <MovieCardSkeleton />
            <MovieCardSkeleton />
            <MovieCardSkeleton />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={displayedMovies}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              onPress={() => navigation.navigate("MovieDetail", { movieId: item.id })}
            />
          )}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: "space-between",
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
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
  skeletonFooterGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  skeletonInitialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
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
