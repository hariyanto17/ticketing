import { prisma } from "../../utils/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface AppUpdateCheckQuery {
  platform?: string;
  appVersion?: string;
  bundleVersion?: number;
}

export interface PublishReleasePayload {
  platform: "android" | "ios";
  appVersion: string;
  bundleVersion: number;
  releaseNotes?: string;
  isMandatory?: boolean;
  bundleFileName?: string;
  bundleBuffer?: Buffer;
  bundleHash?: string;
  binaryDownloadUrl?: string;
}

const BUNDLE_DIR = path.join(process.cwd(), "uploads", "bundles");

// Ensure upload directory exists
if (!fs.existsSync(BUNDLE_DIR)) {
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
}

export const checkAppUpdate = async (query: AppUpdateCheckQuery) => {
  const platform = (query.platform || "android").toLowerCase();
  const currentBundleVersion = Number(query.bundleVersion) || 1;
  const currentAppVersion = query.appVersion || "1.0.0";

  // Fetch settings for OTA configuration
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        startsWith: `ota_${platform}_`,
      },
    },
  });

  const config: Record<string, string> = {};
  for (const s of settings) {
    config[s.key] = s.value;
  }

  const latestBundleVersion = Number(config[`ota_${platform}_bundle_version`]) || 1;
  const latestAppVersion = config[`ota_${platform}_app_version`] || currentAppVersion;
  const isMandatory = config[`ota_${platform}_is_mandatory`] === "true";
  const releaseNotes =
    config[`ota_${platform}_release_notes`] ||
    "Pembaruan performa dan peningkatan fitur aplikasi.";
  const bundleRelativePath = config[`ota_${platform}_bundle_url`] || "";
  const bundleHash = config[`ota_${platform}_bundle_hash`] || "";
  const binaryDownloadUrl =
    config[`ota_${platform}_binary_download_url`] ||
    "https://play.google.com/store/apps/details?id=com.planetcinema";

  // Check if native app version update is required (e.g. 1.0.0 -> 2.0.0)
  const isBinaryUpdateRequired = isNewerVersion(latestAppVersion, currentAppVersion);

  // Check if JS bundle update is available (bundleVersion > currentBundleVersion)
  const isBundleUpdateAvailable = latestBundleVersion > currentBundleVersion;

  const updateAvailable = isBinaryUpdateRequired || isBundleUpdateAvailable;

  return {
    updateAvailable,
    updateType: isBinaryUpdateRequired ? "NATIVE_BINARY" : isBundleUpdateAvailable ? "OTA_BUNDLE" : "NONE",
    isMandatory,
    currentAppVersion,
    latestAppVersion,
    currentBundleVersion,
    latestBundleVersion,
    releaseNotes,
    bundleUrl: bundleRelativePath ? `/uploads/bundles/${path.basename(bundleRelativePath)}` : null,
    bundleHash,
    binaryDownloadUrl,
  };
};

export const publishOtaRelease = async (payload: PublishReleasePayload) => {
  const platform = payload.platform.toLowerCase();
  let bundleHash = payload.bundleHash || "";
  let bundleFileName = payload.bundleFileName || `index.${platform}.v${payload.bundleVersion}.bundle`;

  // If buffer is provided, save it to uploads/bundles
  if (payload.bundleBuffer) {
    const filePath = path.join(BUNDLE_DIR, bundleFileName);
    fs.writeFileSync(filePath, payload.bundleBuffer);

    // Compute SHA256 checksum
    const hashSum = crypto.createHash("sha256");
    hashSum.update(payload.bundleBuffer);
    bundleHash = hashSum.digest("hex");
  }

  const updates = [
    { key: `ota_${platform}_bundle_version`, value: String(payload.bundleVersion) },
    { key: `ota_${platform}_app_version`, value: payload.appVersion },
    { key: `ota_${platform}_is_mandatory`, value: payload.isMandatory ? "true" : "false" },
    { key: `ota_${platform}_release_notes`, value: payload.releaseNotes || "" },
    { key: `ota_${platform}_bundle_url`, value: `/uploads/bundles/${bundleFileName}` },
    { key: `ota_${platform}_bundle_hash`, value: bundleHash },
  ];

  if (payload.binaryDownloadUrl) {
    updates.push({
      key: `ota_${platform}_binary_download_url`,
      value: payload.binaryDownloadUrl,
    });
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.setting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
      })
    )
  );

  return checkAppUpdate({ platform, appVersion: payload.appVersion, bundleVersion: payload.bundleVersion });
};

// Helper: compares semver string (e.g. 1.1.0 > 1.0.0)
function isNewerVersion(latest: string, current: string): boolean {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const [lMaj, lMin, lPat] = parse(latest);
  const [cMaj, cMin, cPat] = parse(current);

  if (lMaj > cMaj) return true;
  if (lMaj === cMaj && lMin > cMin) return true;
  if (lMaj === cMaj && lMin === cMin && lPat > cPat) return true;
  return false;
}
