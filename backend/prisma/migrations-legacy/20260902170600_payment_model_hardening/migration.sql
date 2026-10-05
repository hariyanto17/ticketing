-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "expiredAt" TIMESTAMP(3),
ADD COLUMN     "paymentType" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "providerOrderId" TEXT,
ADD COLUMN     "providerTransactionId" TEXT,
ADD COLUMN     "rawResponse" JSONB,
ADD COLUMN     "redirectUrl" TEXT,
ADD COLUMN     "snapToken" TEXT,
ALTER COLUMN "paidAt" DROP NOT NULL,
ALTER COLUMN "paidAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerTransactionId_key" ON "Payment"("providerTransactionId");
