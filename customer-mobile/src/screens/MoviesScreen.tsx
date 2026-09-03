import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Search, X } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { useGetMoviesQuery } from "../lib/api/movieApi";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { MovieCard } from "../components/movie/MovieCard";

type MoviesScreenRouteProp = RouteProp<RootStackParamList, "Movies">;
type MoviesScreenNavProp = StackNavigationProp<RootStackParamList>;

export const MoviesScreen: React.FC = () => {
  const navigation = useNavigation<MoviesScreenNavProp>();
  const route = useRoute<MoviesScreenRouteProp>();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [search, setSearch] = useState<string>("");
  const [filter, setFilter] = useState<"ALL" | "NOW_SHOWING" | "COMING_SOON">(
    route.params?.initialFilter || "ALL"
  );

  const {
    data: movies = [],
    isLoading,
    isFetching,
    refetch,
  } = useGetMoviesQuery({
    status: filter !== "ALL" ? filter : undefined,
    search: search.trim() ? search.trim() : undefined,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t("home.findMovie")} showBack onBack={() => navigation.goBack()} />

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder={t("home.findMovie")}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <X size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {(["ALL", "NOW_SHOWING", "COMING_SOON"] as const).map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.filterPill,
              {
                backgroundColor: filter === item ? colors.primary : colors.card,
                borderColor: filter === item ? colors.primary : colors.cardBorder,
              },
            ]}
            onPress={() => setFilter(item)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === item ? "#ffffff" : colors.textMuted },
              ]}
            >
              {item === "ALL"
                ? t("common.viewAll")
                : item === "NOW_SHOWING"
                ? t("home.nowShowing")
                : t("home.comingSoon")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Movie List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MovieCard
              movie={item}
              layout="list"
              onPress={() => navigation.navigate("MovieDetail", { movieId: item.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {t("common.error")}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
