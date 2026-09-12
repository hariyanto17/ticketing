import test from "node:test";
import assert from "node:assert/strict";
import { getFilmShowingDates, getFilmSalesReport, getScheduledMovies } from "../modules/reports/service";
import { prisma } from "../utils/prisma";

test("Film Ticket Sales Report Service Tests", async (t) => {
  await t.test("getScheduledMovies: returns only movies that have showtimes", async () => {
    const scheduledMovies = await getScheduledMovies();
    assert.ok(Array.isArray(scheduledMovies));
    for (const m of scheduledMovies) {
      const count = await prisma.showtime.count({ where: { movieId: m.id } });
      assert.ok(count > 0, `Movie ${m.title} should have at least 1 showtime`);
    }
  });

  await t.test("getFilmShowingDates: returns empty array for empty movieId", async () => {
    const dates = await getFilmShowingDates("");
    assert.deepStrictEqual(dates, []);
  });

  await t.test("getFilmSalesReport: throws BAD_REQUEST when movieId or showingDate is missing", async () => {
    await assert.rejects(
      async () => {
        await getFilmSalesReport("", "2026-09-12");
      },
      /Movie ID and showing date are required/
    );

    await assert.rejects(
      async () => {
        await getFilmSalesReport("invalid-id", "");
      },
      /Movie ID and showing date are required/
    );
  });

  await t.test("getFilmSalesReport: throws NOT_FOUND for non-existent movie", async () => {
    await assert.rejects(
      async () => {
        await getFilmSalesReport("00000000-0000-0000-0000-000000000000", "2026-09-12");
      },
      /Movie not found/
    );
  });

  await t.test("getFilmSalesReport: generates valid empty report when movie exists but has no showtimes on date", async () => {
    const movie = await prisma.movie.findFirst();
    if (!movie) return;

    const report = await getFilmSalesReport(movie.id, "2099-01-01");
    assert.ok(report, "Report should be generated");
    assert.strictEqual(report.reportTitle, "TICKET SALES REPORT");
    assert.strictEqual(report.showingDate, "2099-01-01");
    assert.strictEqual(report.movie.id, movie.id);
    assert.strictEqual(report.movie.title, movie.title);
    assert.strictEqual(report.showtimes.length, 0);
    assert.strictEqual(report.totals.paidTickets, 0);
    assert.strictEqual(report.totals.freeTickets, 0);
    assert.strictEqual(report.totals.sales, 0);
  });

  await t.test("getFilmSalesReport: correctly returns report structure with showtimes and totals", async () => {
    const showtime = await prisma.showtime.findFirst({
      where: { status: "PUBLISHED" },
      include: { movie: true, studio: true },
    });
    if (!showtime) return;

    const dateStr = new Date(showtime.businessDate || showtime.startTime).toISOString().split("T")[0];
    const report = await getFilmSalesReport(showtime.movieId, dateStr);

    assert.ok(report);
    assert.strictEqual(report.movie.id, showtime.movieId);
    assert.strictEqual(report.movie.title, showtime.movie.title);
    assert.ok(Array.isArray(report.showtimes));
    assert.ok(typeof report.totals.paidTickets === "number");
    assert.ok(typeof report.totals.freeTickets === "number");
    assert.ok(typeof report.totals.sales === "number");

    // Check sum consistency
    const calculatedPaid = report.showtimes.reduce((sum, s) => sum + s.paidTickets, 0);
    const calculatedSales = report.showtimes.reduce((sum, s) => sum + s.sales, 0);
    assert.strictEqual(report.totals.paidTickets, calculatedPaid);
    assert.strictEqual(report.totals.sales, calculatedSales);
  });

  await t.test("generateFilmSalesExcel: generates valid Excel buffer with master template structure", async () => {
    const { generateFilmSalesExcel } = await import("../modules/reports/excelGenerator");
    const mockReport = {
      reportTitle: "TICKET SALES REPORT",
      distributor: "Mutiara Films",
      cinema: "PLANET CINEMA BONE",
      site: "PLANET CINEMA BONE",
      showingDate: "2026-09-11",
      movie: {
        id: "mock-id",
        title: "SUANGGI: ILMU KUTUKAN",
        format: "2D",
        censorshipRating: "17+",
        durationMinutes: 98,
      },
      showtimes: [
        {
          index: 1,
          scheduleId: "s1",
          time: "14:00",
          startTime: "2026-09-11T14:00:00Z",
          studioName: "Studio 1",
          studioCode: "1",
          seatGrade: "176",
          ticketPrice: 45000,
          paidTickets: 15,
          freeTickets: 0,
          sales: 675000,
        },
        {
          index: 2,
          scheduleId: "s2",
          time: "16:30",
          startTime: "2026-09-11T16:30:00Z",
          studioName: "Studio 1",
          studioCode: "1",
          seatGrade: "176",
          ticketPrice: 45000,
          paidTickets: 25,
          freeTickets: 0,
          sales: 1125000,
        },
      ],
      totals: {
        paidTickets: 40,
        freeTickets: 0,
        sales: 1800000,
      },
    };

    const buffer = await generateFilmSalesExcel(mockReport as any);
    assert.ok(buffer instanceof Buffer, "Should return a valid Buffer");
    assert.ok(buffer.length > 1000, "Buffer size should be non-trivial .xlsx file");

    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.getWorksheet("AEON");
    assert.ok(worksheet, "Worksheet AEON must exist");
    assert.strictEqual(worksheet.getCell("C2").value, "TICKET SALES REPORT");
    assert.strictEqual(worksheet.getCell("A3").value, "Distributor : Mutiara Films");
    assert.strictEqual(worksheet.getCell("C3").value, "SITE : PLANET CINEMA BONE");
    assert.strictEqual(worksheet.getCell("P3").value, "Date of Showing : 11 September 2026");

    // Check header cells
    assert.strictEqual(worksheet.getCell("A4").value, "Cinema");
    assert.strictEqual(worksheet.getCell("B4").value, "Movie");
    assert.strictEqual(worksheet.getCell("F4").value, "1 Showtime");
    assert.strictEqual(worksheet.getCell("F5").value, "Time");
    assert.strictEqual(worksheet.getCell("G5").value, "Paid");

    // Check populated row 6
    assert.strictEqual(worksheet.getCell("A6").value, "1");
    assert.strictEqual(worksheet.getCell("B6").value, "SUANGGI: ILMU KUTUKAN");
    assert.strictEqual(worksheet.getCell("C6").value, "2D");
    assert.strictEqual(worksheet.getCell("D6").value, "176");
    assert.strictEqual(worksheet.getCell("E6").value, 45000);
    assert.strictEqual(worksheet.getCell("F6").value, "14:00");
    assert.strictEqual(worksheet.getCell("G6").value, 15);
    assert.strictEqual(worksheet.getCell("H6").value, "16:30");
    assert.strictEqual(worksheet.getCell("I6").value, 25);
  });
});
