import { lookup } from "dns/promises";
import type { LookupAddress } from "dns";
import { isIP } from "net";
import type { LookupFunction } from "net";
import https from "https";
import type { IncomingMessage } from "http";
import { AppError } from "../../utils/errorHandler";

const ALLOWED_POSTER_HOST = "nos.jkt-1.neo.id";
const ALLOWED_POSTER_PATH =
  /^\/media\.cinema21\.co\.id\/movie-images\/[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.(?:jpe?g|png|webp)$/i;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_POSTER_BYTES = 5 * 1024 * 1024;
const POSTER_FETCH_TIMEOUT_MS = 8_000;

export interface MoviePosterAsset {
  body: Buffer;
  contentType: string;
}

export function parseAllowedMoviePosterUrl(source: string): URL {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw new AppError("BAD_REQUEST", "The saved movie poster URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== ALLOWED_POSTER_HOST ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !ALLOWED_POSTER_PATH.test(url.pathname)
  ) {
    throw new AppError(
      "BAD_REQUEST",
      `Movie posters must use HTTPS from ${ALLOWED_POSTER_HOST} and its approved movie-image path.`
    );
  }
  return url;
}

function isPublicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const octets = address.split(".").map(Number);
  const [first, second, third] = octets;
  if (octets.length !== 4 || octets.some((octet) => octet < 0 || octet > 255)) {
    return false;
  }

  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 88 && third === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
  );
}

async function resolvePublicPosterAddress(hostname: string): Promise<string> {
  let addresses: LookupAddress[];
  try {
    addresses = await lookup(hostname, { all: true, family: 4, verbatim: true });
  } catch {
    throw new AppError("SERVICE_UNAVAILABLE", "The approved poster host could not be resolved.");
  }

  if (
    addresses.length === 0 ||
    addresses.some((entry) => !isPublicIpv4(entry.address))
  ) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "The approved poster host resolved to a non-public IP address."
    );
  }
  return addresses[0].address;
}

function requestPoster(url: URL, pinnedAddress: string): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const lookupPinnedAddress: LookupFunction = (_hostname, options, callback) => {
      if (typeof options === "object" && options.all) {
        callback(null, [{ address: pinnedAddress, family: 4 }]);
      } else {
        callback(null, pinnedAddress, 4);
      }
    };
    const request = https.get(
      url,
      {
        headers: { Accept: "image/jpeg,image/png,image/webp" },
        lookup: lookupPinnedAddress,
        timeout: POSTER_FETCH_TIMEOUT_MS,
      },
      (response) => {
        if (settled) {
          response.destroy();
          return;
        }
        settled = true;
        resolve(response);
      }
    );

    request.on("timeout", () =>
      request.destroy(new Error("Poster host request timed out."))
    );
    request.on("error", finishReject);
  });
}

function getVerifiedContentType(response: IncomingMessage): string {
  const contentType = response.headers["content-type"]
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new AppError(
      "BAD_REQUEST",
      `The poster source returned an unsupported content type (${contentType || "missing"}).`
    );
  }
  return contentType;
}

function validateImageSignature(body: Buffer, contentType: string): void {
  const valid =
    (contentType === "image/jpeg" &&
      body.length >= 3 &&
      body[0] === 0xff &&
      body[1] === 0xd8 &&
      body[2] === 0xff) ||
    (contentType === "image/png" &&
      body.length >= 8 &&
      body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (contentType === "image/webp" &&
      body.length >= 12 &&
      body.toString("ascii", 0, 4) === "RIFF" &&
      body.toString("ascii", 8, 12) === "WEBP");

  if (!valid) {
    throw new AppError(
      "BAD_REQUEST",
      "The poster source returned data that does not match its image content type."
    );
  }
}

export async function getMoviePosterAsset(source: string): Promise<MoviePosterAsset> {
  const url = parseAllowedMoviePosterUrl(source);
  const pinnedAddress = await resolvePublicPosterAddress(url.hostname);

  let response: IncomingMessage;
  try {
    response = await requestPoster(url, pinnedAddress);
  } catch (error) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      error instanceof Error
        ? `Could not retrieve the approved movie poster: ${error.message}`
        : "Could not retrieve the approved movie poster."
    );
  }

  if (response.statusCode !== 200) {
    const status = response.statusCode ?? "unknown";
    response.destroy();
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      `The approved poster host returned HTTP ${status}.`
    );
  }

  const contentLength = Number(response.headers["content-length"]);
  if (Number.isFinite(contentLength) && contentLength > MAX_POSTER_BYTES) {
    response.destroy();
    throw new AppError(
      "PAYLOAD_TOO_LARGE",
      `The movie poster exceeds the ${MAX_POSTER_BYTES / (1024 * 1024)} MiB limit.`
    );
  }

  let contentType: string;
  try {
    contentType = getVerifiedContentType(response);
  } catch (error) {
    response.destroy();
    throw error;
  }

  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    for await (const chunk of response) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > MAX_POSTER_BYTES) {
        response.destroy();
        throw new AppError(
          "PAYLOAD_TOO_LARGE",
          `The movie poster exceeds the ${MAX_POSTER_BYTES / (1024 * 1024)} MiB limit.`
        );
      }
      chunks.push(buffer);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "The approved poster host interrupted the image response."
    );
  }

  const body = Buffer.concat(chunks, totalBytes);
  validateImageSignature(body, contentType);
  return { body, contentType };
}
