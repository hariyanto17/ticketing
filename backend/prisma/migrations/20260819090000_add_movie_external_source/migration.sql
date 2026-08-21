ALTER TABLE "Movie" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Movie" ADD COLUMN "externalMovieId" TEXT;
ALTER TABLE "Movie" ADD COLUMN "externalDistributorId" TEXT;
ALTER TABLE "Movie" ADD COLUMN "externalSnapshot" JSONB;
CREATE UNIQUE INDEX "Movie_externalMovieId_key" ON "Movie"("externalMovieId");