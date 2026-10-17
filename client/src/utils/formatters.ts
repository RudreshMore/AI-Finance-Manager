/**
 * Formats a monetary number or Decimal string into Indian Rupee (INR) or specified currency.
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency = 'INR'
): string => {
  if (amount === null || amount === undefined) return '₹0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';

  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(num);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(num);
};

/**
 * Formats an ISO date string into a user-friendly local date.
 */
export const formatDate = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Formats an ISO date string with time.
 */
export const formatDateTime = (dateStr: string | Date): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Formats AccountType enum to readable label.
 */
export const getAccountTypeLabel = (type: string): string => {
  switch (type) {
    case 'BANK':
      return 'Bank Account';
    case 'CASH':
      return 'Cash Reserve';
    case 'WALLET':
      return 'Digital Wallet';
    case 'CREDIT_CARD':
      return 'Credit Card';
    case 'SAVINGS':
      return 'Savings Account';
    case 'INVESTMENT':
      return 'Investment';
    default:
      return 'Other Account';
  }
};

/**
 * Formats TransactionType enum to readable label.
 */
export const getTransactionTypeLabel = (type: string): string => {
  switch (type) {
    case 'INCOME':
      return 'Income';
    case 'EXPENSE':
      return 'Expense';
    case 'TRANSFER':
      return 'Transfer';
    default:
      return type;
  }
};
