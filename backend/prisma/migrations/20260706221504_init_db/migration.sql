-- CreateEnum
CREATE TYPE "WebsiteStatus" AS ENUM ('Up', 'Down', 'Unknown');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Website" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWebsite" (
    "user_id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "interval_seconds" INTEGER NOT NULL DEFAULT 30,
    "time_added" TIMESTAMP(3) NOT NULL,
    "next_tick" TIMESTAMP(3) NOT NULL,
    "last_tick" TIMESTAMP(3),

    CONSTRAINT "UserWebsite_pkey" PRIMARY KEY ("user_id","website_id")
);

-- CreateTable
CREATE TABLE "WebsiteTick" (
    "id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "status" "WebsiteStatus" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteTick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Website_url_key" ON "Website"("url");

-- CreateIndex
CREATE INDEX "WebsiteTick_user_id_website_id_timestamp_idx" ON "WebsiteTick"("user_id", "website_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteTick_id_timestamp_key" ON "WebsiteTick"("id", "timestamp");

-- AddForeignKey
ALTER TABLE "UserWebsite" ADD CONSTRAINT "UserWebsite_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWebsite" ADD CONSTRAINT "UserWebsite_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTick" ADD CONSTRAINT "WebsiteTick_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteTick" ADD CONSTRAINT "WebsiteTick_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
