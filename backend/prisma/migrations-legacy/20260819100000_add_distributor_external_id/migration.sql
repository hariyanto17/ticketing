ALTER TABLE "Distributor" ADD COLUMN "externalDistributorId" TEXT;
CREATE UNIQUE INDEX "Distributor_externalDistributorId_key" ON "Distributor"("externalDistributorId");