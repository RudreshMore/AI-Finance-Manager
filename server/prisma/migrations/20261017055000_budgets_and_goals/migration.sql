-- Drop foreign key first so MySQL allows dropping the index
ALTER TABLE `budgets` DROP FOREIGN KEY `budgets_userId_fkey`;

-- Drop Old Index
DROP INDEX `budgets_userId_startDate_endDate_idx` ON `budgets`;

-- AlterTable
ALTER TABLE `budgets` DROP COLUMN `endDate`,
    DROP COLUMN `period`,
    DROP COLUMN `startDate`,
    ADD COLUMN `month` INTEGER NOT NULL,
    ADD COLUMN `year` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `budgets_userId_year_month_idx` ON `budgets`(`userId`, `year`, `month`);

-- CreateIndex
CREATE UNIQUE INDEX `budgets_userId_categoryId_month_year_key` ON `budgets`(`userId`, `categoryId`, `month`, `year`);

-- Re-add Foreign Key
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
