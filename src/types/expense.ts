export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Expense {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  category: string;
  description: string;
  status: ExpenseStatus;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
