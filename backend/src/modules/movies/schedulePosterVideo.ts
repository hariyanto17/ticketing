import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError } from "../../utils/errorHandler";

const POSTER_WIDTH = 1920;
const POSTER_HEIGHT = 1080;
const MAX_PNG_BYTES = 10 * 1024 * 1024;
const VIDEO_DURATION_SECONDS = 300;
const FFMPEG_TIMEOUT_MS = 60_000;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
let activeVideoEncodes = 0;

export function validateSchedulePosterPng(image: Buffer): void {
  if (image.length > MAX_PNG_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE", "The TV poster image exceeds the 10 MiB limit.");
  }

  if (
    image.length < 24 ||
    !image.subarray(0, 8).equals(PNG_SIGNATURE) ||
    image.toString("ascii", 12, 16) !== "IHDR"
  ) {
    throw new AppError("BAD_REQUEST", "The uploaded TV poster is not a valid PNG image.");
  }

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== POSTER_WIDTH || height !== POSTER_HEIGHT) {
    throw new AppError(
      "BAD_REQUEST",
      `The TV poster must be ${POSTER_WIDTH}x${POSTER_HEIGHT} pixels.`
    );
  }
}

function encodeMp4(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-loop",
        "1",
        "-framerate",
        "1",
        "-i",
        inputPath,
        "-t",
        String(VIDEO_DURATION_SECONDS),
        "-r",
        "1",
        "-frames:v",
        String(VIDEO_DURATION_SECONDS),
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-tune",
        "stillimage",
        "-crf",
        "23",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        outputPath,
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );

    let stderr = "";
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill("SIGKILL");
    }, FFMPEG_TIMEOUT_MS);

    process.stderr.setEncoding("utf8");
    process.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-8_192);
    });
    process.once("error", (error) => {
      clearTimeout(timeout);
      reject(
        new AppError(
          "SERVICE_UNAVAILABLE",
          `TV poster video encoding could not start: ${error.message}`
        )
      );
    });
    process.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (timedOut) {
        reject(new AppError("SERVICE_UNAVAILABLE", "TV poster video encoding timed out."));
      } else if (code !== 0) {
        reject(
          new AppError(
            "SERVICE_UNAVAILABLE",
            `TV poster video encoding failed: ${stderr.trim() || signal || `exit code ${code}`}`
          )
        );
      } else {
        resolve();
      }
    });
  });
}

export async function createSchedulePosterMp4(image: Buffer): Promise<Buffer> {
  validateSchedulePosterPng(image);
  if (activeVideoEncodes >= 1) {
    throw new AppError(
      "TOO_MANY_REQUESTS",
      "Another TV poster video is being generated. Please try again shortly."
    );
  }

  activeVideoEncodes += 1;
  let tempDirectory: string | undefined;
  try {
    tempDirectory = await mkdtemp(path.join(tmpdir(), "planet-tv-poster-"));
    const inputPath = path.join(tempDirectory, "poster.png");
    const outputPath = path.join(tempDirectory, "poster.mp4");
    await writeFile(inputPath, image, { flag: "wx", mode: 0o600 });
    await encodeMp4(inputPath, outputPath);
    return await readFile(outputPath);
  } finally {
    activeVideoEncodes -= 1;
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  }
}
