-- Alter Accounts Table
ALTER TABLE `accounts` MODIFY `type` ENUM('BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'OTHER') NOT NULL DEFAULT 'BANK',
    MODIFY `currency` VARCHAR(10) NOT NULL DEFAULT 'INR';

-- Alter Transactions Table
ALTER TABLE `transactions` DROP COLUMN `date`,
    DROP COLUMN `notes`,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Drop old foreign keys on transactions so we can adjust constraints and indexes
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_userId_fkey`;
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_accountId_fkey`;
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_destinationAccountId_fkey`;

-- Drop Old Index
DROP INDEX `transactions_userId_date_idx` ON `transactions`;

-- Create New Index
CREATE INDEX `transactions_userId_transactionDate_idx` ON `transactions`(`userId`, `transactionDate`);

-- Re-add Foreign Keys with RESTRICT on accounts and CASCADE on users
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
