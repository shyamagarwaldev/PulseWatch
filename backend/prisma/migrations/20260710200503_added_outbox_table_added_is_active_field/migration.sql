-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('UnProcessed', 'Processed', 'Processing');

-- CreateEnum
CREATE TYPE "OutBoxTask" AS ENUM ('Add', 'Update', 'Delete');

-- AlterTable
ALTER TABLE "UserWebsite" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "OutBox" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "website_id" TEXT NOT NULL,
    "task" "OutBoxTask" NOT NULL,
    "task_status" "TaskStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutBox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutBox_task_status_task_updated_at_idx" ON "OutBox"("task_status", "task", "updated_at");

-- AddForeignKey
ALTER TABLE "WebsiteTick" ADD CONSTRAINT "WebsiteTick_user_id_website_id_fkey" FOREIGN KEY ("user_id", "website_id") REFERENCES "UserWebsite"("user_id", "website_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutBox" ADD CONSTRAINT "OutBox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutBox" ADD CONSTRAINT "OutBox_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
