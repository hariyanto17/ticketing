export type PrinterStatus = "ready" | "offline" | "busy" | "unknown";
export type PrinterCapability = boolean | "unknown";

export interface PrinterInfo {
  id: string;
  name: string;
  status: PrinterStatus;
  isDefault: boolean;
  driver: string;
  capabilities: {
    rawEscPos: PrinterCapability;
    qr: PrinterCapability;
    barcode: PrinterCapability;
    cut: PrinterCapability;
  };
  identifierSource: "native" | "printer-name";
}
