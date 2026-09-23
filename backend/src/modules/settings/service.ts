import { prisma } from "../../utils/prisma";

const DEFAULT_SETTINGS: Record<string, string> = {
  cinemaName: "Planet Cinema",
  logo: "",
  address: "123 Cinema Boulevard, Metropolis",
  phone: "+6281234567890",
  email: "contact@planetcinema.com",
  ticketPrefix: "PCM",
  footerMessage: "Thank you for watching with us!",
  termsAndConditions: "Tickets are non-refundable after screening starts. Please arrive 15 minutes before showtime.",
  taxPercentage: "10",
  taxEnabled: "true",
  paperWidth: "80",
  printLogo: "true",
  printQrCode: "true",
  businessDate: new Date().toISOString().split("T")[0],
  timezone: "Asia/Jakarta",
  currency: "IDR",
  onlineServiceFee: "4000",
};

export const getSettings = async () => {
  const records = await prisma.setting.findMany();
  
  const settingsObj = { ...DEFAULT_SETTINGS };
  for (const record of records) {
    settingsObj[record.key] = record.value;
  }

  return settingsObj;
};

export const updateSettings = async (data: Record<string, any>) => {
  // Upsert all keys
  const keys = Object.keys(data);
  
  await prisma.$transaction(
    keys.map((k) =>
      prisma.setting.upsert({
        where: { key: k },
        update: { value: String(data[k]) },
        create: { key: k, value: String(data[k]) },
      })
    )
  );

  return getSettings();
};
