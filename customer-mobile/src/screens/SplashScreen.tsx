import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import {
  SPLASH_DURATION_MS,
  SPLASH_BACKGROUND_COLOR,
  SPLASH_TAGLINE,
} from "../config/splash";

export { SPLASH_DURATION_MS };

type SplashScreenNavigationProp = StackNavigationProp<RootStackParamList, "Splash">;

export const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textTranslateAnim = useRef(new Animated.Value(12)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation: Fade & Scale logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Tagline entrance
    Animated.parallel([
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.timing(textTranslateAnim, {
        toValue: 0,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Subtle progress bar across the 3 seconds duration
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: SPLASH_DURATION_MS,
      useNativeDriver: false,
    }).start();

    // 4. Timer to seamlessly navigate to MainTabs after 3 seconds
    const timer = setTimeout(() => {
      navigation.replace("MainTabs");
    }, SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim, textFadeAnim, textTranslateAnim, progressAnim, navigation]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" translucent />

      {/* Ambient background glow */}
      <View style={styles.ambientGlow} />

      {/* Main Logo & Branding Container */}
      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textWrapper,
            {
              opacity: textFadeAnim,
              transform: [{ translateY: textTranslateAnim }],
            },
          ]}
        >
          <Text style={styles.tagline}>Experience Cinema Like Never Before</Text>
        </Animated.View>
      </View>

      {/* Bottom subtle progress indicator & version */}
      <View style={styles.footerContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.footerText}>PLANET CINEMA</Text>
      </View>
    </View>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#09090b",
    justifyContent: "center",
    alignItems: "center",
  },
  ambientGlow: {
    position: "absolute",
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    top: "35%",
    alignSelf: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrapper: {
    width: 220,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  textWrapper: {
    alignItems: "center",
    marginTop: 8,
  },
  tagline: {
    color: "#a1a1aa",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  footerContainer: {
    position: "absolute",
    bottom: 48,
    alignItems: "center",
    width: 160,
  },
  progressBarTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#6366f1",
    borderRadius: 2,
  },
  footerText: {
    color: "#52525b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.5,
  },
});
