import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";
import { FilmSalesReportData } from "./service";

const TEMPLATE_DIR = path.join(__dirname, "../../../templates/reports");
const TEMPLATE_PATH = path.join(TEMPLATE_DIR, "film-ticket-sales-template.xlsx");

/**
 * Format showing date into e.g. "11 September 2026"
 */
export const formatShowingDateIndo = (dateStr: string): string => {
  if (!dateStr) return "-";
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const y = parts[0];
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${d} ${months[m] || parts[1]} ${y}`;
  }
  return dateStr;
};

/**
 * Creates and writes the master template if not existing on disk.
 */
export const ensureMasterTemplateExists = async (): Promise<string> => {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
  }

  if (fs.existsSync(TEMPLATE_PATH)) {
    return TEMPLATE_PATH;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "Planet Cinema Management";
  wb.lastModifiedBy = "Planet Cinema Management";
  wb.created = new Date();
  wb.modified = new Date();

  const ws = wb.addWorksheet("AEON", {
    views: [{ showGridLines: true }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Column definitions for A to T
  ws.columns = [
    { key: "A", width: 10 }, // Cinema
    { key: "B", width: 32 }, // Movie
    { key: "C", width: 14 }, // Movie Format
    { key: "D", width: 12 }, // Seat Grade
    { key: "E", width: 14 }, // Sales Price
    { key: "F", width: 10 }, // 1 Showtime Time
    { key: "G", width: 8 },  // 1 Showtime Paid
    { key: "H", width: 10 }, // 2 Showtime Time
    { key: "I", width: 8 },  // 2 Showtime Paid
    { key: "J", width: 10 }, // 3 Showtime Time
    { key: "K", width: 8 },  // 3 Showtime Paid
    { key: "L", width: 10 }, // 4 Showtime Time
    { key: "M", width: 8 },  // 4 Showtime Paid
    { key: "N", width: 10 }, // 5 Showtime Time
    { key: "O", width: 8 },  // 5 Showtime Paid
    { key: "P", width: 12 }, // Total Paid
    { key: "Q", width: 12 }, // Total Free
    { key: "R", width: 18 }, // Total Sales
    { key: "S", width: 8 },  // S
    { key: "T", width: 8 },  // T
  ];

  // Title: Row 2, C2
  const titleCell = ws.getCell("C2");
  titleCell.value = "TICKET SALES REPORT";
  titleCell.font = { name: "Calibri", size: 14, bold: true };

  // Metadata: Row 3
  const distCell = ws.getCell("A3");
  distCell.value = "Distributor : Mutiara Films";
  distCell.font = { name: "Calibri", size: 10, bold: true };

  const siteCell = ws.getCell("C3");
  siteCell.value = "SITE : PLANET CINEMA BONE";
  siteCell.font = { name: "Calibri", size: 10, bold: true };

  const dateCell = ws.getCell("P3");
  dateCell.value = "Date of Showing : 11 September 2026";
  dateCell.font = { name: "Calibri", size: 10, bold: true };

  // Header Rows: Row 4 & 5
  // Merged ranges
  ws.mergeCells("A4:A5");
  ws.mergeCells("B4:B5");
  ws.mergeCells("C4:C5");
  ws.mergeCells("D4:D5");
  ws.mergeCells("E4:E5");
  ws.mergeCells("F4:G4");
  ws.mergeCells("H4:I4");
  ws.mergeCells("J4:K4");
  ws.mergeCells("L4:M4");
  ws.mergeCells("N4:O4");
  ws.mergeCells("P4:Q4");
  ws.mergeCells("R4:R5");

  // Row 4 values
  ws.getCell("A4").value = "Cinema";
  ws.getCell("B4").value = "Movie";
  ws.getCell("C4").value = "Movie Format";
  ws.getCell("D4").value = "Seat Grade";
  ws.getCell("E4").value = "Sales Price";
  ws.getCell("F4").value = "1 Showtime";
  ws.getCell("H4").value = "2 Showtime";
  ws.getCell("J4").value = "3 Showtime";
  ws.getCell("L4").value = "4 Showtime";
  ws.getCell("N4").value = "5 Showtime";
  ws.getCell("P4").value = "Total";
  ws.getCell("R4").value = "Total Sales";

  // Row 5 values
  ws.getCell("F5").value = "Time";
  ws.getCell("G5").value = "Paid";
  ws.getCell("H5").value = "Time";
  ws.getCell("I5").value = "Paid";
  ws.getCell("J5").value = "Time";
  ws.getCell("K5").value = "Paid";
  ws.getCell("L5").value = "Time";
  ws.getCell("M5").value = "Paid";
  ws.getCell("N5").value = "Time";
  ws.getCell("O5").value = "Paid";
  ws.getCell("P5").value = "Paid";
  ws.getCell("Q5").value = "Free";

  // Style header cells (Row 4 & 5, Cols 1 to 18)
  for (let r = 4; r <= 5; r++) {
    const row = ws.getRow(r);
    row.height = 22;
    for (let c = 1; c <= 18; c++) {
      const cell = row.getCell(c);
      cell.font = { name: "Calibri", size: 10, bold: true };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFEFEF" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    }
  }

  await wb.xlsx.writeFile(TEMPLATE_PATH);
  return TEMPLATE_PATH;
};

/**
 * Generate Excel buffer using master template
 */
export const generateFilmSalesExcel = async (reportData: FilmSalesReportData): Promise<Buffer> => {
  const templatePath = await ensureMasterTemplateExists();

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const worksheet = workbook.getWorksheet("AEON") || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Master template invalid: worksheet AEON not found");
  }

  // 1. Populate dynamic metadata header
  const formattedDate = formatShowingDateIndo(reportData.showingDate);

  const distCell = worksheet.getCell("A3");
  distCell.value = `Distributor : ${reportData.distributor || "-"}`;
  distCell.font = { name: "Calibri", size: 10, bold: true };

  const siteCell = worksheet.getCell("C3");
  siteCell.value = `SITE : ${reportData.site || reportData.cinema || "-"}`;
  siteCell.font = { name: "Calibri", size: 10, bold: true };

  const dateCell = worksheet.getCell("P3");
  dateCell.value = `Date of Showing : ${formattedDate}`;
  dateCell.font = { name: "Calibri", size: 10, bold: true };

  // 2. Group showtimes into rows by Studio & Price combination
  // A row represents a Studio/Cinema + Price + Format combination
  interface StudioRowGroup {
    studioCode: string;
    studioName: string;
    seatGrade: string;
    ticketPrice: number;
    showtimes: Array<{ time: string; paidTickets: number }>;
  }

  const rowGroupsMap = new Map<string, StudioRowGroup>();

  for (const st of reportData.showtimes) {
    const key = `${st.studioCode}_${st.ticketPrice}`;
    if (!rowGroupsMap.has(key)) {
      rowGroupsMap.set(key, {
        studioCode: st.studioCode,
        studioName: st.studioName,
        seatGrade: st.seatGrade || "176",
        ticketPrice: st.ticketPrice,
        showtimes: [],
      });
    }
    rowGroupsMap.get(key)!.showtimes.push({
      time: st.time,
      paidTickets: st.paidTickets,
    });
  }

  // If no showtimes exist, create 1 empty row for template compliance
  const rowGroups: StudioRowGroup[] =
    rowGroupsMap.size > 0
      ? Array.from(rowGroupsMap.values())
      : [
          {
            studioCode: "1",
            studioName: "Studio 1",
            seatGrade: "176",
            ticketPrice: 45000,
            showtimes: [],
          },
        ];

  const startRow = 6;
  let currentRowIndex = startRow;

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };

  for (let i = 0; i < rowGroups.length; i++) {
    const group = rowGroups[i];
    const r = currentRowIndex;
    const row = worksheet.getRow(r);
    row.height = 20;

    // Col A: Cinema
    const cellA = row.getCell(1);
    cellA.value = group.studioCode || String(i + 1);
    cellA.alignment = { vertical: "middle", horizontal: "center" };
    cellA.font = { name: "Calibri", size: 10 };
    cellA.border = thinBorder;

    // Col B: Movie Title
    const cellB = row.getCell(2);
    cellB.value = reportData.movie.title.toUpperCase();
    cellB.alignment = { vertical: "middle", horizontal: "left" };
    cellB.font = { name: "Calibri", size: 10 };
    cellB.border = thinBorder;

    // Col C: Movie Format
    const cellC = row.getCell(3);
    cellC.value = reportData.movie.format || "2D";
    cellC.alignment = { vertical: "middle", horizontal: "center" };
    cellC.font = { name: "Calibri", size: 10 };
    cellC.border = thinBorder;

    // Col D: Seat Grade
    const cellD = row.getCell(4);
    cellD.value = group.seatGrade || "176";
    cellD.alignment = { vertical: "middle", horizontal: "center" };
    cellD.font = { name: "Calibri", size: 10 };
    cellD.border = thinBorder;

    // Col E: Sales Price
    const cellE = row.getCell(5);
    cellE.value = group.ticketPrice;
    cellE.numFmt = "#,##0";
    cellE.alignment = { vertical: "middle", horizontal: "right" };
    cellE.font = { name: "Calibri", size: 10 };
    cellE.border = thinBorder;

    // Showtimes 1 to 5 (Pairs F:G, H:I, J:K, L:M, N:O)
    const showtimeColStarts = [6, 8, 10, 12, 14]; // F, H, J, L, N
    for (let slot = 0; slot < 5; slot++) {
      const timeCol = showtimeColStarts[slot];
      const paidCol = timeCol + 1;
      const st = group.showtimes[slot];

      const cellTime = row.getCell(timeCol);
      const cellPaid = row.getCell(paidCol);

      cellTime.value = st ? st.time : "";
      cellTime.alignment = { vertical: "middle", horizontal: "center" };
      cellTime.font = { name: "Calibri", size: 10 };
      cellTime.border = thinBorder;

      cellPaid.value = st ? st.paidTickets : "";
      cellPaid.numFmt = "#,##0";
      cellPaid.alignment = { vertical: "middle", horizontal: "center" };
      cellPaid.font = { name: "Calibri", size: 10 };
      cellPaid.border = thinBorder;
    }

    // Col P: Total Paid formula
    const cellP = row.getCell(16);
    cellP.value = {
      formula: `SUM(G${r},I${r},K${r},M${r},O${r})`,
      date1904: false,
    };
    cellP.numFmt = "#,##0";
    cellP.alignment = { vertical: "middle", horizontal: "center" };
    cellP.font = { name: "Calibri", size: 10, bold: true };
    cellP.border = thinBorder;

    // Col Q: Total Free
    const cellQ = row.getCell(17);
    cellQ.value = 0;
    cellQ.numFmt = "#,##0";
    cellQ.alignment = { vertical: "middle", horizontal: "center" };
    cellQ.font = { name: "Calibri", size: 10 };
    cellQ.border = thinBorder;

    // Col R: Total Sales formula
    const cellR = row.getCell(18);
    cellR.value = {
      formula: `P${r}*E${r}`,
      date1904: false,
    };
    cellR.numFmt = "#,##0";
    cellR.alignment = { vertical: "middle", horizontal: "right" };
    cellR.font = { name: "Calibri", size: 10, bold: true };
    cellR.border = thinBorder;

    currentRowIndex++;
  }

  // 3. Total Row
  const lastDataRow = currentRowIndex - 1;
  const totalRowIndex = currentRowIndex;
  const totalRow = worksheet.getRow(totalRowIndex);
  totalRow.height = 22;

  const totalBorder: Partial<ExcelJS.Borders> = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "double" },
    right: { style: "thin" },
  };

  // Col A: total
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = "total";
  totalLabelCell.alignment = { vertical: "middle", horizontal: "center" };
  totalLabelCell.font = { name: "Calibri", size: 10, bold: true };
  totalLabelCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  totalLabelCell.border = totalBorder;

  // Empty cells between B and O for clean border formatting
  for (let c = 2; c <= 15; c++) {
    const emptyCell = totalRow.getCell(c);
    emptyCell.border = totalBorder;
    emptyCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFEFEF" },
    };
  }

  // Col P: Total Paid SUM
  const totalPaidCell = totalRow.getCell(16);
  totalPaidCell.value = {
    formula: `SUM(P${startRow}:P${lastDataRow})`,
    date1904: false,
  };
  totalPaidCell.numFmt = "#,##0";
  totalPaidCell.alignment = { vertical: "middle", horizontal: "center" };
  totalPaidCell.font = { name: "Calibri", size: 10, bold: true };
  totalPaidCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  totalPaidCell.border = totalBorder;

  // Col Q: Total Free SUM
  const totalFreeCell = totalRow.getCell(17);
  totalFreeCell.value = {
    formula: `SUM(Q${startRow}:Q${lastDataRow})`,
    date1904: false,
  };
  totalFreeCell.numFmt = "#,##0";
  totalFreeCell.alignment = { vertical: "middle", horizontal: "center" };
  totalFreeCell.font = { name: "Calibri", size: 10, bold: true };
  totalFreeCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  totalFreeCell.border = totalBorder;

  // Col R: Total Sales SUM
  const totalSalesCell = totalRow.getCell(18);
  totalSalesCell.value = {
    formula: `SUM(R${startRow}:R${lastDataRow})`,
    date1904: false,
  };
  totalSalesCell.numFmt = "#,##0";
  totalSalesCell.alignment = { vertical: "middle", horizontal: "right" };
  totalSalesCell.font = { name: "Calibri", size: 10, bold: true };
  totalSalesCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFEFEF" },
  };
  totalSalesCell.border = totalBorder;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};
