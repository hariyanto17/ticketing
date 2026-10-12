import type { Movie } from "@/services/movieApi";
import type { Schedule } from "@/services/studioApi";
import { API_BASE_URL } from "@/lib/api/api";

export const SCHEDULE_POSTER_WIDTH = 1080;
export const SCHEDULE_POSTER_HEIGHT = 1350;
export const SCHEDULE_TV_POSTER_WIDTH = 1920;
export const SCHEDULE_TV_POSTER_HEIGHT = 1080;

const CINEMA_TIME_ZONE = "Asia/Makassar";
const RATING_BADGE_SIZE = 52;
const RATING_BADGE_GAP = 16;
const POSTER_TO_SCHEDULE_GAP = 42;
const SCHEDULE_TO_FOOTER_GAP = 54;
const FOOTER_TEXT_FONT_SIZE = 40;
const FOOTER_TEXT_BOTTOM_GAP = 41;

export interface SchedulePosterMovie {
  id: string;
  title: string;
  poster: string | null;
  durationMinutes: number | null;
  censorshipRating: string | null;
  genres: string[];
  times: string[];
}

export interface SchedulePosterResult {
  blob: Blob;
}

export interface ScheduleTvPosterResult extends SchedulePosterResult {
  studioId: string;
  studioName: string;
}

export class PosterImageLoadError extends Error {
  constructor(
    public readonly movieTitle: string,
    public readonly sourceUrl: string,
    public readonly reason: string
  ) {
    super(`Could not load poster for "${movieTitle}": ${reason}`);
    this.name = "PosterImageLoadError";
  }
}

export function getScheduleDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CINEMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function groupPublishedSchedulesByMovie(
  schedules: Schedule[],
  movies: Movie[],
  dateKey: string
): SchedulePosterMovie[] {
  const movieGenres = new Map(
    movies.map((movie) => [
      movie.id,
      movie.genres.map(({ genre }) => genre.name).filter(Boolean),
    ])
  );
  const grouped = new Map<string, SchedulePosterMovie>();
  const selectedSchedules = schedules
    .filter(
      (schedule) =>
        schedule.status === "PUBLISHED" &&
        getScheduleDateKey(schedule.businessDate) === dateKey
    )
    .sort(
      (first, second) =>
        new Date(first.startTime).getTime() - new Date(second.startTime).getTime()
    );

  selectedSchedules.forEach((schedule) => {
    const movie = schedule.movie;
    if (!movie) return;

    const entry = grouped.get(schedule.movieId) ?? {
      id: schedule.movieId,
      title: movie.title,
      poster: movie.poster ?? null,
      durationMinutes: movie.durationMinutes ?? null,
      censorshipRating: movie.censorshipRating ?? null,
      genres: movieGenres.get(schedule.movieId) ?? [],
      times: [],
    };
    entry.times.push(schedule.startTime);
    grouped.set(schedule.movieId, entry);
  });

  return [...grouped.values()];
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The browser could not decode the image."));
    image.src = source;
  });
}

async function loadMoviePoster(movie: SchedulePosterMovie): Promise<HTMLImageElement> {
  const sourceUrl = movie.poster ?? "";
  if (!sourceUrl) {
    throw new PosterImageLoadError(
      movie.title,
      "(no poster URL saved)",
      "No poster URL is saved for this movie."
    );
  }

  const endpoint = `${API_BASE_URL.replace(/\/$/, "")}/movies/${encodeURIComponent(movie.id)}/poster`;
  const headers = new Headers();
  const token = localStorage.getItem("token");
  if (token) headers.set("authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(endpoint, { credentials: "include", headers });
  } catch (error) {
    throw new PosterImageLoadError(
      movie.title,
      sourceUrl,
      error instanceof Error
        ? `Could not reach the authenticated poster endpoint: ${error.message}`
        : "Could not reach the authenticated poster endpoint."
    );
  }

  if (!response.ok) {
    let reason = `Poster endpoint returned HTTP ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        reason = body.message;
      }
    } catch {
      // Keep the explicit HTTP status when the server did not return JSON.
    }
    throw new PosterImageLoadError(movie.title, sourceUrl, reason);
  }

  const contentType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (!contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new PosterImageLoadError(
      movie.title,
      sourceUrl,
      `Poster endpoint returned an unsupported content type (${contentType || "missing"}).`
    );
  }

  const objectUrl = URL.createObjectURL(await response.blob());
  try {
    return await loadImage(objectUrl);
  } catch (error) {
    throw new PosterImageLoadError(
      movie.title,
      sourceUrl,
      error instanceof Error ? error.message : "The browser could not decode the image."
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (currentLine && context.measureText(candidate).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  });

  if (currentLine) lines.push(currentLine);
  return lines;
}

function ellipsize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (context.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function getPosterDateLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00+08:00`);
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: CINEMA_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("weekday").toLocaleUpperCase("id-ID")}, ${part("day")} ${part("month").toLocaleUpperCase("id-ID")} ${part("year")}`;
}

function formatShowtime(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: CINEMA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

function formatPosterDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} menit`;
  if (!remainingMinutes) return `${hours}h`;
  return `${hours}h, ${remainingMinutes} menit`;
}

export function getRatingColor(rating: string | null): string {
  switch (rating?.trim().toUpperCase()) {
    case "SU":
      return "#08A32F";
    case "13+":
    case "R13":
    case "R13+":
    case "D13+":
      return "#FEC708";
    case "17+":
    case "R17+":
    case "D17+":
      return "#FF383C";
    case "21+":
    case "R21+":
    case "D21+":
      return "#000000";
    default:
      return "#52525b";
  }
}

function getMetadata(movie: SchedulePosterMovie): string {
  const details: string[] = [];
  if (movie.durationMinutes && movie.durationMinutes > 0) {
    details.push(formatPosterDuration(movie.durationMinutes));
  }
  if (movie.genres.length) details.push(movie.genres.join(", "));
  return details.join("  •  ");
}

function getCanvasFontFamily(): string {
  const nextFontFamily = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-roboto")
    .split(",")[0]
    .trim();
  return nextFontFamily || "Arial";
}

async function loadRoboto(): Promise<string> {
  const fontFamily = getCanvasFontFamily();
  await document.fonts.load(`700 16px ${fontFamily}`);
  return fontFamily;
}

function drawCoverImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const scale = Math.max(width / image.width, height / image.height);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  const cropX = (image.width - cropWidth) / 2;
  const cropY = (image.height - cropHeight) / 2;
  context.drawImage(
    image,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    x,
    y,
    width,
    height
  );
}

interface PosterRowLayout {
  movie: SchedulePosterMovie;
  metadataLines: string[];
  showtimes: string[];
  height: number;
}

function calculatePosterRows(
  context: CanvasRenderingContext2D,
  movies: SchedulePosterMovie[],
  contentWidth: number,
  scale: number
): PosterRowLayout[] {
  const fontFamily = getCanvasFontFamily();
  const titleFontSize = 24 * scale;
  const metadataFontSize = 16 * scale;
  const timeFontSize = 20 * scale;
  const titleLineHeight = titleFontSize + 5;
  const metadataLineHeight = metadataFontSize + 3;
  const timeLineHeight = timeFontSize + 3;
  const showtimeAreaWidth = 330;
  const leftContentWidth = contentWidth - showtimeAreaWidth - 24;
  return movies.map((movie) => {
    const detailWidth =
      leftContentWidth -
      (movie.censorshipRating
        ? (RATING_BADGE_SIZE + RATING_BADGE_GAP) * scale
        : 0);
    const metadata = getMetadata(movie);
    context.font = `700 ${metadataFontSize}px ${fontFamily}`;
    const metadataLines = wrapText(context, metadata, detailWidth);
    context.font = `700 ${timeFontSize}px ${fontFamily}`;
    const showtimes = movie.times.map(formatShowtime);
    const showtimeRows = Math.max(
      Math.min(2, showtimes.length),
      Math.max(0, showtimes.length - 2)
    );
    const detailHeight =
      titleLineHeight +
      (metadataLines.length ? 2 + metadataLines.length * metadataLineHeight : 0);
    const contentHeight = Math.max(
      detailHeight,
      movie.censorshipRating ? RATING_BADGE_SIZE * scale : 0
    ) + 8;
    const showtimeHeight = showtimeRows * timeLineHeight;
    return {
      movie,
      metadataLines,
      showtimes,
      height: Math.max(contentHeight, showtimeHeight) + 8,
    };
  });
}

function drawScheduleRows(
  context: CanvasRenderingContext2D,
  movies: SchedulePosterMovie[],
  fontFamily: string,
  listTop: number,
  listBottom: number
): void {
  const outerPadding = 62;
  const contentWidth = SCHEDULE_POSTER_WIDTH - outerPadding * 2;
  const showtimeAreaWidth = 330;
  const showtimeGap = 18;
  const showtimeColumnWidth = (showtimeAreaWidth - showtimeGap) / 2;
  const availableHeight = listBottom - listTop;
  if (!movies.length) return;

  let scale = 1;
  let rows = calculatePosterRows(context, movies, contentWidth, scale);
  const slotHeight = availableHeight / rows.length;

  while (
    Math.max(...rows.map((row) => row.height)) > slotHeight &&
    scale > 0.5
  ) {
    scale -= 0.05;
    rows = calculatePosterRows(context, movies, contentWidth, scale);
  }

  context.strokeStyle = "#fff";
  context.lineWidth = 3;
  for (let index = 1; index <= rows.length; index += 1) {
    const boundaryY = listTop + index * slotHeight;
    context.beginPath();
    context.moveTo(outerPadding, boundaryY);
    context.lineTo(outerPadding + contentWidth, boundaryY);
    context.stroke();
  }

  rows.forEach(({
    movie,
    metadataLines,
    showtimes,
    height,
  }, index) => {
    const slotTop = listTop + index * slotHeight;
    const contentTop = slotTop + (slotHeight - height) / 2;
    const titleFontSize = 24 * scale;
    const metadataFontSize = 16 * scale;
    const timeFontSize = 20 * scale;
    const titleLineHeight = titleFontSize + 5;
    const metadataLineHeight = metadataFontSize + 3;
    const timeLineHeight = timeFontSize + 3;
    const leftContentWidth = contentWidth - showtimeAreaWidth - 24;
    const hasRating = Boolean(movie.censorshipRating);
    const ratingBadgeSize = RATING_BADGE_SIZE * scale;
    const ratingBadgeGap = RATING_BADGE_GAP * scale;
    const detailWidth =
      leftContentWidth -
      (hasRating ? ratingBadgeSize + ratingBadgeGap : 0);
    const showtimeStartX =
      outerPadding + contentWidth - showtimeAreaWidth;
    const badgeX = outerPadding;
    const detailHeight =
      titleLineHeight +
      (metadataLines.length ? 2 + metadataLines.length * metadataLineHeight : 0);
    const detailTop = contentTop + (height - detailHeight) / 2;
    const titleX = outerPadding + (hasRating ? ratingBadgeSize + ratingBadgeGap : 0);
    const titleWidth = detailWidth - 6;
    const titleY = detailTop + titleFontSize;

    if (movie.censorshipRating) {
      const badgeY = contentTop + (height - ratingBadgeSize) / 2;
      context.fillStyle = getRatingColor(movie.censorshipRating);
      context.beginPath();
      context.roundRect(
        badgeX,
        badgeY,
        ratingBadgeSize,
        ratingBadgeSize,
        12 * scale
      );
      context.fill();
      context.fillStyle = "#ffffff";
      context.font = `700 ${16 * scale}px ${fontFamily}`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(
        movie.censorshipRating,
        badgeX + ratingBadgeSize / 2,
        badgeY + ratingBadgeSize / 2
      );
    }

    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    context.fillStyle = "#ffffff";
    context.font = `700 ${titleFontSize}px ${fontFamily}`;
    context.fillText(ellipsize(context, movie.title, titleWidth), titleX, titleY);

    let textY = detailTop + titleLineHeight;
    if (metadataLines.length) {
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.font = `700 ${metadataFontSize}px ${fontFamily}`;
      metadataLines.forEach((line) => {
        textY += metadataLineHeight;
        context.fillText(line, titleX, textY);
      });
      textY += 2;
    }

    context.fillStyle = "#ffffff";
    context.font = `700 ${timeFontSize}px ${fontFamily}`;
    const showtimeRows = Math.max(
      Math.min(2, showtimes.length),
      Math.max(0, showtimes.length - 2)
    );
    const showtimeHeight = showtimeRows * timeLineHeight;
    const showtimeTop = contentTop + (height - showtimeHeight) / 2;
    const showtimeMetrics = context.measureText("00:00");
    const showtimeInkHeight =
      showtimeMetrics.actualBoundingBoxAscent +
      showtimeMetrics.actualBoundingBoxDescent;
    showtimes.forEach((showtime, index) => {
      const column = index < 2 ? 0 : 1;
      const row = column === 0 ? index : index - 2;
      const columnCount = column === 0
        ? Math.min(2, showtimes.length)
        : showtimes.length - 2;
      const isSingleShowtime = showtimes.length === 1;
      const cellWidth = showtimeColumnWidth;
      const x = showtimeStartX +
        (column * (showtimeColumnWidth + showtimeGap));
      const verticalGap =
        (slotHeight - columnCount * showtimeInkHeight) / (columnCount + 1);
      context.textAlign = "center";
      context.fillText(
        showtime,
        x + cellWidth / 2,
        isSingleShowtime
          ? showtimeTop + 1.5 * timeLineHeight
          : slotTop +
            verticalGap +
            showtimeMetrics.actualBoundingBoxAscent +
            row * (showtimeInkHeight + verticalGap)
      );
    });
  });
}

export async function renderSchedulePoster(
  movies: SchedulePosterMovie[],
  dateKey: string
): Promise<SchedulePosterResult> {
  const canvas = document.createElement("canvas");
  canvas.width = SCHEDULE_POSTER_WIDTH;
  canvas.height = SCHEDULE_POSTER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not available in this browser.");

  const background = await loadImage("/background-ig.png");
  const fontFamily = await loadRoboto();
  context.drawImage(background, 0, 0, SCHEDULE_POSTER_WIDTH, SCHEDULE_POSTER_HEIGHT);

  context.textAlign = "center";
  context.textBaseline = "top";
  context.fillStyle = "#ffffff";
  context.font = `700 39px ${fontFamily}`;
  context.fillText("JADWAL TAYANG FILM", SCHEDULE_POSTER_WIDTH / 2, 180);
  context.font = `700 28px ${fontFamily}`;
  context.fillText(getPosterDateLabel(dateKey), SCHEDULE_POSTER_WIDTH / 2, 232);

  const posterTop = 302;
  const posterCount = movies.length;
  const posterWidth = Math.min(
    132,
    (SCHEDULE_POSTER_WIDTH - 120) / Math.max(1, posterCount)
  );
  const posterHeight = posterWidth * 1.48;
  const stripWidth = posterCount * posterWidth;
  const stripLeft = (SCHEDULE_POSTER_WIDTH - stripWidth) / 2;
  const posterImages = new Map<string, HTMLImageElement>();
  const loadedPosters = await Promise.all(
    movies.map(async (movie) => [movie.id, await loadMoviePoster(movie)] as const)
  );
  loadedPosters.forEach(([movieId, image]) => posterImages.set(movieId, image));

  movies.forEach((movie, index) => {
    const x = stripLeft + index * posterWidth;
    const image = posterImages.get(movie.id);
    if (!image) throw new Error(`Loaded poster image is missing for "${movie.title}".`);
    context.save();
    context.beginPath();
    context.rect(x, posterTop, posterWidth, posterHeight);
    context.clip();
    drawCoverImage(context, image, x, posterTop, posterWidth, posterHeight);
    context.restore();
  });

  const listTop = posterTop + posterHeight + POSTER_TO_SCHEDULE_GAP;
  const footerTextTop =
    SCHEDULE_POSTER_HEIGHT - FOOTER_TEXT_BOTTOM_GAP - FOOTER_TEXT_FONT_SIZE;
  const listBottom = footerTextTop - SCHEDULE_TO_FOOTER_GAP;
  drawScheduleRows(context, movies, fontFamily, listTop, listBottom);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "bottom";
  context.font = `700 ${FOOTER_TEXT_FONT_SIZE}px ${fontFamily}`;
  context.fillText(
    "BELI TIKETNYA SEGERA!",
    SCHEDULE_POSTER_WIDTH / 2,
    SCHEDULE_POSTER_HEIGHT - FOOTER_TEXT_BOTTOM_GAP
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("The browser could not export the poster as PNG."));
    }, "image/png");
  });

  return { blob };
}

interface TvPosterMovie {
  id: string;
  title: string;
  censorshipRating: string | null;
  times: string[];
}

interface TvPosterStudio {
  id: string;
  name: string;
  movies: TvPosterMovie[];
}

export async function renderScheduleTvPoster(
  schedules: Schedule[],
  dateKey: string
): Promise<SchedulePosterResult> {
  const selectedSchedules = schedules
    .filter(
      (schedule) =>
        schedule.status === "PUBLISHED" &&
        getScheduleDateKey(schedule.businessDate) === dateKey
    )
    .sort(
      (first, second) =>
        new Date(first.startTime).getTime() - new Date(second.startTime).getTime()
    );

  if (!selectedSchedules.length) {
    throw new Error("No published schedules are available for this date.");
  }

  const studioMap = new Map<string, TvPosterStudio>();
  selectedSchedules.forEach((schedule) => {
    const studio = studioMap.get(schedule.studioId) ?? {
      id: schedule.studioId,
      name: schedule.studio.name,
      movies: [],
    };
    let movie = studio.movies.find((item) => item.id === schedule.movieId);
    if (!movie) {
      movie = {
        id: schedule.movieId,
        title: schedule.movie.title,
        censorshipRating: schedule.movie.censorshipRating ?? null,
        times: [],
      };
      studio.movies.push(movie);
    }
    movie.times.push(schedule.startTime);
    studioMap.set(schedule.studioId, studio);
  });
  const studios = [...studioMap.values()].sort(
    (first, second) =>
      first.name.localeCompare(second.name, "id", {
        numeric: true,
        sensitivity: "base",
      }) || first.id.localeCompare(second.id)
  );

  const canvas = document.createElement("canvas");
  canvas.width = SCHEDULE_TV_POSTER_WIDTH;
  canvas.height = SCHEDULE_TV_POSTER_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is not available in this browser.");

  const background = await loadImage("/background-tv.png");
  const fontFamily = await loadRoboto();
  drawCoverImage(
    context,
    background,
    0,
    0,
    SCHEDULE_TV_POSTER_WIDTH,
    SCHEDULE_TV_POSTER_HEIGHT
  );

  const topMargin = 200;
  const bottomMargin = 64;
  const leftMargin = 160;
  const rightMargin = 160;
  const contentHeight = SCHEDULE_TV_POSTER_HEIGHT - topMargin - bottomMargin;
  const contentRight = SCHEDULE_TV_POSTER_WIDTH - rightMargin;
  const studioAreaWidth = 430;
  const studioTextX = leftMargin;
  const listLeft = 660;
  const ratingBadgeSize = RATING_BADGE_SIZE;
  const ratingX = contentRight - ratingBadgeSize;
  const ratingGap = 24;
  const timesLeft = listLeft + (ratingX - ratingGap - listLeft) * 0.57;
  const timeColumnGap = 24;
  const timeColumnWidth =
    (ratingX - ratingGap - timesLeft - timeColumnGap) / 2;
  const titleWidth = timesLeft - listLeft - 36;
  const totalMovieRows = studios.reduce(
    (count, studio) => count + Math.max(1, studio.movies.length),
    0
  );
  const separatorWidth = 8;
  let studioTop = topMargin;

  studios.forEach((studio, studioIndex) => {
    const studioWeight = Math.max(1, studio.movies.length);
    const studioHeight = contentHeight * studioWeight / totalMovieRows;
    const hasSeparatorAbove = studioIndex > 0;
    const hasSeparatorBelow = studioIndex < studios.length - 1;
    const separatorGap = separatorWidth + 16;
    const rowContentTop = studioTop + (hasSeparatorAbove ? separatorGap / 2 : 0);
    const rowContentBottom =
      studioTop + studioHeight - (hasSeparatorBelow ? separatorGap / 2 : 0);
    const rowContentHeight = rowContentBottom - rowContentTop;

    if (hasSeparatorAbove) {
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.roundRect(
        leftMargin,
        studioTop - separatorWidth / 2,
        contentRight - leftMargin,
        separatorWidth,
        2
      );
      context.fill();
    }

    let studioFontSize = 78;
    context.font = `700 ${studioFontSize}px ${fontFamily}`;
    const studioName = studio.name.toLocaleUpperCase("id-ID");
    let studioLines = wrapText(context, studioName, studioAreaWidth);
    while (
      studioFontSize > 28 &&
      studioLines.length * (studioFontSize + 12) > rowContentHeight
    ) {
      studioFontSize -= 2;
      context.font = `700 ${studioFontSize}px ${fontFamily}`;
      studioLines = wrapText(context, studioName, studioAreaWidth);
    }
    context.fillStyle = "#ffffff";
    context.font = `700 ${studioFontSize}px ${fontFamily}`;
    context.textAlign = "left";
    context.textBaseline = "middle";
    const studioLineHeight = studioFontSize + 12;
    const studioTextTop =
      rowContentTop + (rowContentHeight - studioLines.length * studioLineHeight) / 2;
    studioLines.forEach((line, lineIndex) => {
      context.fillText(
        line,
        studioTextX,
        studioTextTop + lineIndex * studioLineHeight + studioLineHeight / 2,
        studioAreaWidth
      );
    });

    const movieHeight = rowContentHeight / Math.max(1, studio.movies.length);
    studio.movies.forEach((movie, movieIndex) => {
      const movieTop = rowContentTop + movieIndex * movieHeight;
      const movieCenterY = movieTop + movieHeight / 2;
      const showtimes = movie.times.map(formatShowtime);
      const showtimeRows = Math.max(
        Math.min(2, showtimes.length),
        Math.max(0, showtimes.length - 2)
      );
      const timeRowHeight = Math.min(34, movieHeight / Math.max(1, showtimeRows));
      const timeFontSize = Math.max(14, Math.min(24, timeRowHeight * 0.75 + 4));
      const titleFontSize = Math.max(20, Math.min(44, movieHeight * 0.3 + 8));

      context.fillStyle = "#ffffff";
      context.font = `700 ${titleFontSize}px ${fontFamily}`;
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(
        ellipsize(context, movie.title, titleWidth),
        listLeft,
        movieCenterY,
        titleWidth
      );

      context.font = `700 ${timeFontSize}px ${fontFamily}`;
      context.textAlign = "center";
      const timesTop = movieCenterY - showtimeRows * timeRowHeight / 2;
      showtimes.forEach((showtime, timeIndex) => {
        const column = timeIndex < 2 ? 0 : 1;
        const row = column === 0 ? timeIndex : timeIndex - 2;
        const x = timesLeft + column * (timeColumnWidth + timeColumnGap);
        context.fillText(
          showtime,
          x + timeColumnWidth / 2,
          timesTop + (row + 0.5) * timeRowHeight,
          timeColumnWidth
        );
      });

      if (movie.censorshipRating) {
        const badgeY = movieCenterY - ratingBadgeSize / 2;
        context.fillStyle = getRatingColor(movie.censorshipRating);
        context.beginPath();
        context.roundRect(ratingX, badgeY, ratingBadgeSize, ratingBadgeSize, 12);
        context.fill();
        context.fillStyle = "#ffffff";
        context.font = `700 16px ${fontFamily}`;
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(
          movie.censorshipRating,
          ratingX + ratingBadgeSize / 2,
          movieCenterY,
          ratingBadgeSize - 8
        );
      }
    });

    studioTop += studioHeight;
  });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("The browser could not export the TV poster as PNG."));
    }, "image/png");
  });

  return { blob };
}
