export interface PortfolioProject {
    id: string;
    title: string;
    description?: string | null;
    projectLink?: string | null;
    technologiesUsed?: string | null;
    completionDate?: string | null;
    createdById: string;
    createdBy: {
        name: string;
        employeeId: string;
    };
    createdAt: string;
    updatedAt: string;
}
