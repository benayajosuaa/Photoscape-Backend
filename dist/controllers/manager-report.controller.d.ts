import type { Request, Response } from 'express';
export declare const ManagerReportController: {
    getFilterOptions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getDailySummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getBookings(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getStudioUsage(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTransactions(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getActivityLogs(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPerformance(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
};
//# sourceMappingURL=manager-report.controller.d.ts.map