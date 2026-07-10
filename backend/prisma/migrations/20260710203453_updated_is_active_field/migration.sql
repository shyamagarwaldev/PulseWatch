/*
  Warnings:

  - You are about to drop the column `createdAt` on the `OutBox` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `UserWebsite` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Website` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OutBox" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "UserWebsite" DROP COLUMN "isActive",
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Website" DROP COLUMN "createdAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
