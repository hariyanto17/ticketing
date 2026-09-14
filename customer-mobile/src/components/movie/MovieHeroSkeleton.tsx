import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { Skeleton } from "../common/Skeleton";

const { width } = Dimensions.get("window");
const HERO_WIDTH = width - 32;

export const MovieHeroSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      <Skeleton width={HERO_WIDTH} height={220} borderRadius={20} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    marginTop: 16,
  },
});
