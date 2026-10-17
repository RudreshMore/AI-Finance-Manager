-- Drop Old Index
DROP INDEX `transactions_userId_date_idx` ON `transactions`;

-- Alter Accounts Table
ALTER TABLE `accounts` MODIFY `type` ENUM('BANK', 'CASH', 'WALLET', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'OTHER') NOT NULL DEFAULT 'BANK',
    MODIFY `currency` VARCHAR(10) NOT NULL DEFAULT 'INR';

-- Alter Transactions Table
ALTER TABLE `transactions` DROP COLUMN `date`,
    DROP COLUMN `notes`,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `transactionDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Create New Index
CREATE INDEX `transactions_userId_transactionDate_idx` ON `transactions`(`userId`, `transactionDate`);

-- Add Foreign Keys with RESTRICT
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_destinationAccountId_fkey` FOREIGN KEY (`destinationAccountId`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
