import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { generateTransactionExcel, getDateInTimezone, TRANSACTION_HEADERS } from "../modules/reports/transactionExcelGenerator";

const sampleTransaction = {
  number: 1345,
  createdBy: "Putri",
  accountName: "tiketing",
  transactionDate: "2026-09-16",
  theater: "2",
  filmName: "AGENSI RUMAH TANGGA",
  invoiceCode: "INVB260916021",
  qty: 2,
  price: 45000,
  discount: 45000,
  isCard: true,
  cardNumber: "",
  isPromo: "BUY 1 GET 1",
  freePass: "Tidak",
  supplierDistributor: "STARVISION",
};

test("transaction Excel export preserves exact columns and transaction data", async () => {
  const buffer = await generateTransactionExcel([sampleTransaction]);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  const sheet = workbook.getWorksheet("Transactions");
  assert.ok(sheet);

  const headers = Array.from({ length: 17 }, (_, index) => sheet!.getRow(1).getCell(index + 1).value);
  assert.deepStrictEqual(headers, TRANSACTION_HEADERS);
  assert.strictEqual(sheet!.columnCount, 17);
  assert.strictEqual(sheet!.getCell("A2").value, 1345);
  assert.strictEqual(sheet!.getCell("D2").value instanceof Date, true);
  assert.strictEqual(sheet!.getCell("D2").numFmt, "dd-mm-yyyy");
  assert.strictEqual(sheet!.getCell("G2").value, "INVB260916021");
  assert.strictEqual(sheet!.getCell("H2").value, 2);
  assert.strictEqual(sheet!.getCell("J2").value, 90000);
  assert.strictEqual(sheet!.getCell("K2").value, 45000);
  assert.strictEqual(sheet!.getCell("L2").value, 45000);
  assert.strictEqual(sheet!.getCell("M2").value, true);
  assert.strictEqual(sheet!.getCell("N2").value, "");
  assert.strictEqual(sheet!.getCell("Q2").value, "STARVISION");
  assert.strictEqual((sheet!.views[0] as any).ySplit, 1);
});

test("transaction Excel export rejects discounts greater than subtotal", async () => {
  await assert.rejects(
    generateTransactionExcel([{ ...sampleTransaction, discount: 90001 }]),
    /Discount tidak boleh lebih besar dari Sub Total/
  );
});

test("transaction date uses Makassar calendar date rather than UTC date", () => {
  const createdAt = new Date("2026-10-06T17:30:00.000Z");
  assert.strictEqual(getDateInTimezone(createdAt, "Asia/Makassar"), "2026-10-07");
});
