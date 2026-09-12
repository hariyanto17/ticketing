import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "../config/api";

const { OtaUpdateModule } = NativeModules;

export interface OtaCheckResult {
  updateAvailable: boolean;
  updateType: "OTA_BUNDLE" | "NATIVE_BINARY" | "NONE";
  isMandatory: boolean;
  currentAppVersion: string;
  latestAppVersion: string;
  currentBundleVersion: number;
  latestBundleVersion: number;
  releaseNotes: string;
  bundleUrl: string | null;
  bundleHash: string | null;
  binaryDownloadUrl: string;
}

export interface OtaProgressData {
  progress: number; // 0.0 to 1.0
  downloaded: number;
  total: number;
}

const STORAGE_KEY_BUNDLE_VERSION = "@pc_ota_bundle_version";
const STORAGE_KEY_LAST_CHECK = "@pc_ota_last_check";

export const otaService = {
  /**
   * Get native application info (versionName, buildNumber, active OTA status)
   */
  getAppInfo: async (): Promise<{
    appVersion: string;
    buildNumber: number;
    hasOtaBundle: boolean;
    otaBundleSize: number;
  }> => {
    if (Platform.OS !== "android" || !OtaUpdateModule) {
      return {
        appVersion: "1.0.0",
        buildNumber: 1,
        hasOtaBundle: false,
        otaBundleSize: 0,
      };
    }
    try {
      return await OtaUpdateModule.getAppInfo();
    } catch (e) {
      console.warn("Failed to get native app info:", e);
      return {
        appVersion: "1.0.0",
        buildNumber: 1,
        hasOtaBundle: false,
        otaBundleSize: 0,
      };
    }
  },

  /**
   * Get active JS bundle version stored locally
   */
  getCurrentBundleVersion: async (): Promise<number> => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY_BUNDLE_VERSION);
      return val ? parseInt(val, 10) : 1;
    } catch {
      return 1;
    }
  },

  /**
   * Check for OTA Updates from Planet Cinema Express backend
   */
  checkForUpdates: async (): Promise<OtaCheckResult | null> => {
    try {
      const appInfo = await otaService.getAppInfo();
      const currentBundleVersion = await otaService.getCurrentBundleVersion();

      const query = new URLSearchParams({
        platform: Platform.OS,
        appVersion: appInfo.appVersion,
        bundleVersion: String(currentBundleVersion),
      });

      const response = await fetch(`${API_BASE_URL}/app-updates/check?${query.toString()}`);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const resJson = await response.json();
      await AsyncStorage.setItem(STORAGE_KEY_LAST_CHECK, new Date().toISOString());

      return resJson.data as OtaCheckResult;
    } catch (err) {
      console.warn("[OTA] Failed to check for updates:", err);
      return null;
    }
  },

  /**
   * Download new bundle and apply it instantly
   */
  downloadAndApplyUpdate: async (
    updateInfo: OtaCheckResult,
    onProgress?: (progressData: OtaProgressData) => void
  ): Promise<boolean> => {
    if (Platform.OS !== "android" || !OtaUpdateModule) {
      console.warn("[OTA] OtaUpdateModule not available on this platform.");
      return false;
    }

    if (!updateInfo.bundleUrl) {
      throw new Error("Bundle URL is empty");
    }

    // Construct full download URL if relative
    const fullUrl = updateInfo.bundleUrl.startsWith("http")
      ? updateInfo.bundleUrl
      : `${API_BASE_URL.replace(/\/api$/, "")}${updateInfo.bundleUrl}`;

    let subscription: any = null;
    if (onProgress) {
      const eventEmitter = new NativeEventEmitter(OtaUpdateModule);
      subscription = eventEmitter.addListener("OtaDownloadProgress", (data: OtaProgressData) => {
        onProgress(data);
      });
    }

    try {
      console.log(`[OTA] Starting bundle download from: ${fullUrl}`);
      const downloadResult = await OtaUpdateModule.downloadBundle(
        fullUrl,
        updateInfo.bundleHash || null
      );

      if (downloadResult.success) {
        console.log(`[OTA] Bundle downloaded successfully: ${downloadResult.bundlePath}`);
        await AsyncStorage.setItem(
          STORAGE_KEY_BUNDLE_VERSION,
          String(updateInfo.latestBundleVersion)
        );

        if (subscription) subscription.remove();

        // Reload React Native engine to run updated bundle
        await OtaUpdateModule.reloadApp();
        return true;
      }
      return false;
    } catch (error) {
      if (subscription) subscription.remove();
      console.error("[OTA] Download & apply failed:", error);
      throw error;
    }
  },

  /**
   * Rollback to default APK asset bundle
   */
  rollbackToDefault: async (): Promise<boolean> => {
    if (Platform.OS !== "android" || !OtaUpdateModule) return false;
    try {
      await OtaUpdateModule.clearOtaBundle();
      await AsyncStorage.setItem(STORAGE_KEY_BUNDLE_VERSION, "1");
      await OtaUpdateModule.reloadApp();
      return true;
    } catch (e) {
      console.error("[OTA] Rollback failed:", e);
      return false;
    }
  },
};
