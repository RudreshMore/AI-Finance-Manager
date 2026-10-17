/*
  Warnings:

  - The required column `family` was added to the `refresh_tokens` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE `otp_tokens` ADD COLUMN `attempts` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `refresh_tokens` ADD COLUMN `family` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE INDEX `refresh_tokens_tokenHash_idx` ON `refresh_tokens`(`tokenHash`);

-- CreateIndex
CREATE INDEX `refresh_tokens_family_idx` ON `refresh_tokens`(`family`);
