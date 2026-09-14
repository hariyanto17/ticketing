import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "../common/Skeleton";

const { width } = Dimensions.get("window");
const GRID_ITEM_WIDTH = (width - 48) / 2;

export const MovieCardSkeleton: React.FC = () => {
  return (
    <View style={[styles.gridCard, { width: GRID_ITEM_WIDTH }]}>
      {/* Poster Skeleton with 2:3 aspect ratio */}
      <Skeleton
        width="100%"
        height={GRID_ITEM_WIDTH * 1.5}
        borderRadius={14}
        style={styles.poster}
      />
      {/* Title Skeleton */}
      <Skeleton width="85%" height={14} borderRadius={4} style={styles.title} />
      {/* Duration/Meta Skeleton */}
      <Skeleton width="50%" height={12} borderRadius={4} style={styles.meta} />
    </View>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    marginBottom: 16,
  },
  poster: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 6,
  },
  meta: {
    marginTop: 2,
  },
});
