export enum TransactionFlow {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export const TRANSACTION_FLOWS = [
  TransactionFlow.INCOME,
  TransactionFlow.EXPENSE,
] as const;

export const DEFAULT_EXPENSE_TRANSACTION_TYPES = [
  { code: 'food', name: 'Food' },
  { code: 'shopping', name: 'Shopping' },
  { code: 'transport', name: 'Transport' },
  { code: 'entertainment', name: 'Entertainment' },
  { code: 'health', name: 'Health' },
  { code: 'education', name: 'Education' },
  { code: 'other', name: 'Other' },
] as const;

export const DEFAULT_INCOME_TRANSACTION_TYPES = [
  { code: 'salary', name: 'Salary' },
  { code: 'gift', name: 'Gift' },
] as const;
