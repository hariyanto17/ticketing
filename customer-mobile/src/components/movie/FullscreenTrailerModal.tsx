import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  ExternalLink,
  Film,
  AlertCircle,
} from "lucide-react-native";
// @ts-ignore
import Video from "react-native-video";
import { useLanguage } from "../../context/LanguageContext";
import { getYouTubeVideoId } from "../../utils/format";

interface FullscreenTrailerModalProps {
  visible: boolean;
  movieTitle: string;
  trailerUrl?: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const FullscreenTrailerModal: React.FC<FullscreenTrailerModalProps> = ({
  visible,
  movieTitle,
  trailerUrl,
  onClose,
}) => {
  const { t } = useLanguage();
  const videoRef = useRef<any>(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const youtubeId = getYouTubeVideoId(trailerUrl);
  const isYoutube = !!youtubeId;

  const handleOpenExternal = async () => {
    if (!trailerUrl) return;
    try {
      const urlToOpen = youtubeId
        ? `https://www.youtube.com/watch?v=${youtubeId}`
        : trailerUrl;
      const canOpen = await Linking.canOpenURL(urlToOpen);
      if (canOpen) {
        await Linking.openURL(urlToOpen);
      }
    } catch (e) {
      console.warn("Could not open trailer link", e);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.seek(0);
      setPaused(false);
      setError(false);
    }
  };

  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden={!showControls} barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* Main Video View / Touch Area */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.videoTouchWrapper}
          onPress={toggleControls}
        >
          {trailerUrl && !error ? (
            <Video
              ref={videoRef}
              source={{ uri: trailerUrl }}
              style={styles.video}
              resizeMode="contain"
              repeat={true}
              paused={paused}
              muted={muted}
              controls={Platform.OS === "android" ? true : false}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="ignore"
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          ) : (
            <View style={styles.fallbackContainer}>
              <Film size={48} color="#e11d48" />
              <Text style={styles.fallbackTitle}>{movieTitle}</Text>
              <Text style={styles.fallbackSub}>
                {error
                  ? "Tidak dapat memutar format video secara langsung."
                  : t("movieDetail.noSchedules")}
              </Text>
              {trailerUrl && (
                <TouchableOpacity
                  style={styles.externalButton}
                  onPress={handleOpenExternal}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={16} color="#ffffff" />
                  <Text style={styles.externalButtonText}>Buka Trailer di YouTube / Browser</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {loading && !error && (
            <View style={styles.centerLoading}>
              <ActivityIndicator size="large" color="#e11d48" />
              <Text style={styles.loadingText}>Memuat Trailer...</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Top Floating Header & Controls Overlay */}
        {showControls && (
          <View style={styles.headerOverlay} pointerEvents="box-none">
            <View style={styles.headerContent}>
              <View style={styles.titleColumn}>
                <Text style={styles.movieTitle} numberOfLines={1}>
                  {movieTitle}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={styles.trailerBadge}>
                    <Text style={styles.trailerBadgeText}>TRAILER RESMI</Text>
                  </View>
                  {isYoutube && (
                    <TouchableOpacity onPress={handleOpenExternal} style={styles.youtubeLinkBtn}>
                      <ExternalLink size={12} color="#ffffff" />
                      <Text style={styles.youtubeLinkText}>YouTube</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <X size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Bottom Floating Controls Bar */}
        {showControls && trailerUrl && !error && (
          <View style={styles.bottomControlsOverlay} pointerEvents="box-none">
            <View style={styles.controlsBar}>
              {/* Play / Pause */}
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={() => setPaused((prev) => !prev)}
                activeOpacity={0.7}
              >
                {paused ? (
                  <Play size={22} color="#ffffff" fill="#ffffff" />
                ) : (
                  <Pause size={22} color="#ffffff" fill="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Mute / Unmute */}
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={() => setMuted((prev) => !prev)}
                activeOpacity={0.7}
              >
                {muted ? (
                  <VolumeX size={22} color="#ef4444" />
                ) : (
                  <Volume2 size={22} color="#ffffff" />
                )}
              </TouchableOpacity>

              {/* Replay */}
              <TouchableOpacity
                style={styles.controlIconBtn}
                onPress={handleRestart}
                activeOpacity={0.7}
              >
                <RotateCcw size={20} color="#ffffff" />
              </TouchableOpacity>

              {/* External YouTube Link Button */}
              {isYoutube && (
                <TouchableOpacity
                  style={styles.openExternalBtn}
                  onPress={handleOpenExternal}
                  activeOpacity={0.8}
                >
                  <ExternalLink size={14} color="#ffffff" />
                  <Text style={styles.openExternalText}>Buka di App</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoTouchWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  centerLoading: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    gap: 12,
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  fallbackContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    maxWidth: 320,
  },
  fallbackTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  fallbackSub: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  externalButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#e11d48",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  externalButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 54 : (StatusBar.currentHeight || 28) + 12,
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleColumn: {
    flex: 1,
    marginRight: 16,
    gap: 4,
  },
  movieTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trailerBadge: {
    backgroundColor: "#e11d48",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trailerBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  youtubeLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youtubeLinkText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "600",
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomControlsOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingTop: 16,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  controlIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  openExternalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  openExternalText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
