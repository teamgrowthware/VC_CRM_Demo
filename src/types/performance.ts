export interface PerformanceReview {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    name: string;
    department?: {
      name: string;
    };
  };
  reviewerId: string;
  reviewer?: {
    id: string;
    name: string;
  };
  rating: number;
  feedback: string;
  period: string;
  createdAt: string;
  updatedAt: string;
}
