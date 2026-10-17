export enum TransactionFlow {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export const TRANSACTION_FLOWS = [
  TransactionFlow.INCOME,
  TransactionFlow.EXPENSE,
] as const;

/** Mã loại dùng làm fallback khi xoá loại custom (N-04) — có cho cả 2 flow. */
export const FALLBACK_TRANSACTION_TYPE_CODE = 'other';

export type DefaultTransactionTypeSeed = {
  code: string;
  flow: TransactionFlow;
  name: string;
  description: string | null;
  iconKey: string;
  color: string;
  sortOrder: number;
};

/** M-07. `food` và `health` cố ý trùng màu. Màu income tạm thời — chờ design chốt. */
export const DEFAULT_TRANSACTION_TYPES: readonly DefaultTransactionTypeSeed[] =
  [
    {
      code: 'entertainment',
      flow: TransactionFlow.EXPENSE,
      name: 'Entertainment',
      description: 'Movies, games, hobbies',
      iconKey: 'entertainment',
      color: '#79A9E8',
      sortOrder: 0,
    },
    {
      code: 'food',
      flow: TransactionFlow.EXPENSE,
      name: 'Food & Dining',
      description: 'Meals, drinks, groceries',
      iconKey: 'food',
      color: '#55C995',
      sortOrder: 1,
    },
    {
      code: 'transport',
      flow: TransactionFlow.EXPENSE,
      name: 'Transportation',
      description: 'Fuel, public transport, taxi',
      iconKey: 'transport',
      color: '#E6B35F',
      sortOrder: 2,
    },
    {
      code: 'health',
      flow: TransactionFlow.EXPENSE,
      name: 'Health',
      description: 'Medical, medicine, health care',
      iconKey: 'health',
      color: '#55C995',
      sortOrder: 3,
    },
    {
      code: 'education',
      flow: TransactionFlow.EXPENSE,
      name: 'Education',
      description: 'Books, courses, tuition',
      iconKey: 'education',
      color: '#4387E5',
      sortOrder: 4,
    },
    {
      code: 'shopping',
      flow: TransactionFlow.EXPENSE,
      name: 'Shopping',
      description: 'Clothes, electronics, daily goods',
      iconKey: 'shopping',
      color: '#F06F73',
      sortOrder: 5,
    },
    {
      code: 'other',
      flow: TransactionFlow.EXPENSE,
      name: 'Other',
      description: 'Other expenses',
      iconKey: 'other',
      color: '#7F96B0',
      sortOrder: 6,
    },
    {
      code: 'salary',
      flow: TransactionFlow.INCOME,
      name: 'Salary',
      description: null,
      iconKey: 'salary',
      color: '#2EB872',
      sortOrder: 7,
    },
    {
      code: 'gift',
      flow: TransactionFlow.INCOME,
      name: 'Gift',
      description: null,
      iconKey: 'gift',
      color: '#B57EDC',
      sortOrder: 8,
    },
    {
      code: 'other',
      flow: TransactionFlow.INCOME,
      name: 'Other income',
      description: 'Other income',
      iconKey: 'other',
      color: '#7F96B0',
      sortOrder: 9,
    },
  ];
