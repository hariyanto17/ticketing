import ExcelJS from "exceljs";
import { AppError } from "../../utils/errorHandler";

export const TRANSACTION_HEADERS = [
  "#",
  "Created By",
  "Acount Name",
  "Transaction Date",
  "Theater",
  "Film Name",
  "Invoice Code",
  "Qty",
  "Price",
  "Sub Total",
  "Disc",
  "Sub total - Disc",
  "Is Card",
  "Card Number",
  "Is Promo",
  "Free Pass",
  "Supplier / Distributor",
] as const;

export interface TransactionExcelInput {
  number: number;
  createdBy: string;
  accountName: string;
  transactionDate: string;
  theater: string;
  filmName: string;
  invoiceCode: string;
  qty: number;
  price: number;
  discount: number;
  isCard: boolean;
  cardNumber: string;
  isPromo: string;
  freePass: string;
  supplierDistributor: string;
}

const text = (value: unknown): string => (value === null || value === undefined ? "" : String(value));

export const getDateInTimezone = (date: Date, timezone: string): string =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: timezone }).format(date);

const toExcelDateSerial = (dateText: string): number => {
  const [year, month, day] = dateText.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86400000 + 25569;
};

export const generateTransactionExcel = async (input: unknown): Promise<Buffer> => {
  if (!Array.isArray(input)) {
    throw new AppError("BAD_REQUEST", "Transaction rows must be an array.");
  }

  const transactions = input.map((item: any, index: number) => {
    const rowNumber = index + 1;
    const qty = Number(item.qty);
    const price = Number(item.price);
    const discount = Number(item.discount ?? 0);
    const dateText = text(item.transactionDate);
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateText) ? new Date(`${dateText}T00:00:00Z`) : new Date("invalid");

    if (!Number.isInteger(Number(item.number)) || Number(item.number) < 0) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: nomor urut tidak valid.`);
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Qty harus integer lebih dari 0.`);
    }
    if (!Number.isFinite(price) || price < 0) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Price harus angka minimal 0.`);
    }
    if (!Number.isFinite(discount) || discount < 0) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Disc harus angka minimal 0.`);
    }
    if (!text(item.invoiceCode).trim()) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Invoice Code wajib diisi.`);
    }
    if (Number.isNaN(parsedDate.getTime())) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Transaction Date tidak valid.`);
    }
    const subtotal = qty * price;
    if (discount > subtotal) {
      throw new AppError("BAD_REQUEST", `Transaksi ${rowNumber}: Discount tidak boleh lebih besar dari Sub Total.`);
    }

    return {
      number: Number(item.number),
      createdBy: text(item.createdBy),
      accountName: text(item.accountName),
      transactionDate: dateText,
      theater: text(item.theater),
      filmName: text(item.filmName),
      invoiceCode: text(item.invoiceCode).trim(),
      qty,
      price,
      subtotal,
      discount,
      netTotal: subtotal - discount,
      isCard: Boolean(item.isCard),
      cardNumber: text(item.cardNumber),
      isPromo: text(item.isPromo) || "-",
      freePass: text(item.freePass) || "Tidak",
      supplierDistributor: text(item.supplierDistributor),
    };
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Planet Cinema";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Transactions", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = [
    { header: TRANSACTION_HEADERS[0], key: "number", width: 10 },
    { header: TRANSACTION_HEADERS[1], key: "createdBy", width: 20 },
    { header: TRANSACTION_HEADERS[2], key: "accountName", width: 20 },
    { header: TRANSACTION_HEADERS[3], key: "transactionDate", width: 18 },
    { header: TRANSACTION_HEADERS[4], key: "theater", width: 12 },
    { header: TRANSACTION_HEADERS[5], key: "filmName", width: 32 },
    { header: TRANSACTION_HEADERS[6], key: "invoiceCode", width: 24 },
    { header: TRANSACTION_HEADERS[7], key: "qty", width: 10 },
    { header: TRANSACTION_HEADERS[8], key: "price", width: 16 },
    { header: TRANSACTION_HEADERS[9], key: "subtotal", width: 16 },
    { header: TRANSACTION_HEADERS[10], key: "discount", width: 16 },
    { header: TRANSACTION_HEADERS[11], key: "netTotal", width: 18 },
    { header: TRANSACTION_HEADERS[12], key: "isCard", width: 12 },
    { header: TRANSACTION_HEADERS[13], key: "cardNumber", width: 22 },
    { header: TRANSACTION_HEADERS[14], key: "isPromo", width: 22 },
    { header: TRANSACTION_HEADERS[15], key: "freePass", width: 14 },
    { header: TRANSACTION_HEADERS[16], key: "supplierDistributor", width: 30 },
  ];

  for (const transaction of transactions) {
    const row = sheet.addRow({
      ...transaction,
      transactionDate: toExcelDateSerial(transaction.transactionDate),
    });
    row.getCell(4).numFmt = "dd-mm-yyyy";
    for (const column of [9, 10, 11, 12]) row.getCell(column).numFmt = "#,##0";
    row.getCell(7).numFmt = "@";
    row.getCell(14).numFmt = "@";
    row.alignment = { vertical: "middle" };
  }

  const header = sheet.getRow(1);
  header.height = 26;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
  header.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  sheet.autoFilter = { from: "A1", to: `Q${transactions.length + 1}` };

  return Buffer.from(await workbook.xlsx.writeBuffer());
};
